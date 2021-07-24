import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DEFAULT_PAGE_NUM } from "src/constant";
import {
	FileDTO,
	InstallWidgetDTO,
} from "src/controllers/widgets-store.controller";
import {
	Widgets,
	WidgetsDoc,
	SingleWidgetDTO,
} from "src/schemas/widgets-store.schema";
import { res, ErrorCode, addUserWidget } from "src/utils";
import { ProjectsService } from "./projects.service";
import { UserService } from "./user.service";

const enum SearchTag {
	User = 0 << 1,
	Name = 0 << 2,
	ShowName = 0 << 3,
	Description = 0 << 4,
}

@Injectable()
export class WidgetsStoreService {
	constructor(
		@InjectModel(Widgets.name) private widgetsModel: Model<WidgetsDoc>,
		private userService: UserService,
		private projectService: ProjectsService,
	) {}

	async createWidget(body: SingleWidgetDTO): Promise<WidgetsDoc> {
		const newWidget = new this.widgetsModel({
			name: body.name,
			widgetsInfoStr: body.widgetsInfoStr,
		});
		await newWidget.save();
		return newWidget;
	}

	/*
	page从1开始
	*/
	async searchWidget(
		keyword: string,
		tag: number,
		page: number,
		num = DEFAULT_PAGE_NUM,
	) {
		const re = new RegExp(keyword);
		const result: Widgets[] = [];
		const queries: any[] = [];
		if (tag & SearchTag.Name) {
			queries.push({ name: { $regex: re } });
		}
		if (tag & SearchTag.ShowName) {
			queries.push({ showName: { $regex: re } });
		}
		if (tag & SearchTag.Description) {
			queries.push({ name: { $regex: re } });
		}

		await this.widgetsModel
			.find({
				$or: queries,
			})
			.skip((page - 1) * num)
			.limit(num)
			.exec();

		return result;
	}

	async findAllWidgets(page: number, num = DEFAULT_PAGE_NUM) {
		const widgets = await this.widgetsModel
			.find({ privacy: false })
			.skip((page - 1) * num)
			.limit(num)
			.exec();
		const all = await this.widgetsModel.count().exec();
		return res(ErrorCode.Success, {
			totalPages: Math.ceil(all / num),
			totalNum: all,
			page,
			widgets,
		});
	}

	async publish({ umd, esm, style }: FileDTO, body: SingleWidgetDTO) {
		// 上传本地服务器
		const filePath = await addUserWidget(
			body.uid,
			body.name,
			umd[0],
			esm[0],
			style[0],
		);

		const author = await this.userService.findUser(body.uid);
		if (!author) {
			return res(ErrorCode.Fail, "没有该作者");
		}

		const newWidget = await this.createWidget(body);
		newWidget.author = author;
		newWidget.umdPath = filePath.umdPath;
		newWidget.esmPath = filePath.esmPath;
		newWidget.stylePath = filePath.stylePath;
		await newWidget.save();

		author.widgets.push(newWidget);
		await author.save();
		return res(ErrorCode.Success, "发布组件成功");
	}

	/*
	安装组件
	-告诉前端该组件文件路径
	-为该project的dependencies增加这个新组件
	*/
	async installWidget(body: InstallWidgetDTO) {
		const widget = await this.widgetsModel.findById(body.wid).exec();
		if (widget == null) {
			return res(ErrorCode.Fail, "没有找到该组件，可能已被删除");
		}

		//增加项目的依赖
		const project = await this.projectService.findProject(body.pid);
		if (!project) {
			return res(ErrorCode.Fail, "没有找到此项目");
		}
		project.dependencies.push(widget);
		await project.save();

		return res(ErrorCode.Success, {
			umdPath: widget.umdPath,
			stylePath: widget.stylePath,

			//esm文件路径目前没什么用，不过多返回一个也不伤性能，方便后续更改吧
			esmPath: widget.esmPath,
		});
	}

	/*
	删除组件
	-删除项目依赖中该组件
	*/
	async dropWidget(body: InstallWidgetDTO) {
		const project = await this.projectService.findProject(body.pid);
		const idx = project.dependencies.findIndex(
			(it) => it.toString() == project._id.toString(),
		);
		if (idx == -1) return res(ErrorCode.Fail, "已经删除过该组件");
		project.dependencies.splice(idx, 1);
		await project.save();
		return res(ErrorCode.Success, "卸载组件成功");
	}
}