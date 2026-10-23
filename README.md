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

`npm test` 会先编译项目，再执行领域规则、错误原子性、分词、文件保存和真实 CLI 检查。

## 创建并查看图片

运行 `npm run cli`，在 `svg>` 后逐行输入（不用输入提示符）：

```text
init 400 200
create rect r1 30 40 100 60 red
create rect r2 160 40 80 60 #4a90d9
tree
save demo.svg
```

文件保存在终端当前工作目录中；从项目根目录启动时，就是项目根目录的 demo.svg。
将该文件拖入 Edge、Chrome 或 Firefox，即可看到左侧红色矩形和右侧蓝色矩形。
保存新内容后刷新浏览器。这里不需要 HTTP 服务，也不需要安装 VS Code 扩展。

仓库内提供可直接打开的 [examples/rectangles.svg](examples/rectangles.svg)，以及生成它的 [命令脚本](examples/rectangles.txt)。
在 PowerShell 的项目根目录可回放：

```powershell
Get-Content examples/rectangles.txt | npm run cli
```

## 当前命令与边界

- `init [w] [h]`：默认画布为 800×600；仅提供宽度时高度默认 600。
- `create rect <id> <x> <y> <w> <h> [fill]`：浮点坐标、非负宽高、可选 fill；省略 fill 时不输出该属性。
- `tree [id]`：显示全部矩形或指定矩形。
- `save [file.svg]`：首次必须给路径，成功后可省略并复用路径；init 后忘记旧路径。已有文件会被替换，父目录必须已存在。
- `help`：查看当前已实现的命令。

以 # 开头的整行是注释，命令中的十六进制颜色不会被截断；带空格的路径或参数使用双引号。输入 EOF 或 Ctrl+C 退出。

当前尚未实现其他图形、容器与 in 后缀、编辑、撤销重做和 SVG 读取。save 对历史的屏障行为将在历史模块阶段实现。

架构与过程记录见 [doc/README.md](doc/README.md)。
