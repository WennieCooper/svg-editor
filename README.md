# SVG Editor CLI

高级软件开发 Lab1 Phase 1：使用 TypeScript 实现命令行 SVG 编辑器。

## 开发

要求 Node.js 22 或兼容版本，以及 npm。

```sh
npm ci
npm run cli
npm run typecheck
npm test
```

`npm test` 会先编译项目，再执行领域规则、错误原子性、分词和真实 CLI 检查。

## 当前可运行示例

```text
init 400 200
create rect r1 30 40 100 60 red
create rect r2 160 40 80 60 #4a90d9
tree
tree r1
```

默认画布为 800×600。矩形支持浮点坐标、非负宽高、可选 fill。以 # 开头的整行是注释，命令中的十六进制颜色不会被截断。支持双引号参数；输入 EOF 或 Ctrl+C 退出。

当前只实现 help、init、create rect 和 tree。其他图形、容器与 in 后缀、编辑、撤销重做和 SVG 读写会分步实现；现在尚不能导出图片。

架构与过程记录见 [doc/README.md](doc/README.md)。
