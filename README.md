# 可视化页面编辑器
monorepo
全部是绝对布局，方便实现
解耦组件与编辑器，组件功能完全无限制
不同组件可以通过任务中心（全局订阅发布）进行通信
可以实时动态引入其它人编写的组件

### packages
server-side: 可视化页面搭建项目的服务端（nest框架）

editor: 可视化页面搭建的基本组件

preset: 在线搭建的前端部分（内部基于editor基本组件）

v-generator-template: 可视化页面搭建项目的模板文件

widget-factory: 基于vite开发自定义的组件

cmd: 命令行面板，方便开发完组件后上传（WIP...）


clothes: 定制衣服图案项目
