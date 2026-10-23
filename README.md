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

npm test 会先编译项目，再执行领域规则、失败原子性、分词、SVG 保存和真实 CLI 检查。

## 创建、编辑并查看图片

运行 npm run cli，在 svg> 后逐行输入（不用输入提示符）：

```text
init 600 300
create rect r1 30 40 100 60 #4a90d9
create circle c1 200 70 30 #f5a623
create ellipse e1 330 70 50 25 #6abf69
create line l1 80 150 400 150 black
create text title 30 220 "My SVG"
move r1 10 0
scale c1 1.2
set title text "Shapes & editing"
set e1 stroke black
set e1 stroke-width 2
show c1
tree
save demo.svg
```

文件保存在终端当前工作目录中；从项目根目录启动时，就是项目根目录的 demo.svg。
将文件拖入 Edge、Chrome 或 Firefox 即可查看，重新保存后刷新浏览器。不需要 HTTP 服务或额外扩展。

现成示例：[两个矩形](examples/rectangles.svg)、[五种图形与编辑](examples/shapes.svg)、[容器与节点组合](examples/groups.svg)。
在 PowerShell 项目根目录回放完整例子：

```powershell
Get-Content -Encoding UTF8 examples/shapes.txt | npm run cli
```

## 当前命令

- init [w] [h]：默认 800×600；仅提供宽度时高度默认 600。
- create：五种叶子图形，完整参数见 help。
- create g <id>：创建容器。所有 create 可追加 in <containerId>，在创建时指定父级。
- group <newGid> <id1> <id2>...：至少两个图形，按原树顺序收编到新组，位置规则见架构文档。
- ungroup <gid>：解散嵌套组，子图形占据组原来的位置；按要求禁止解散根级组。
- addto <gid> <id>：移动图形到目标组末尾，禁止循环嵌套。
- move <id> <dx> <dy>：增量平移；直线两端点、容器全部子孙一起移动。
- scale <id> <factor>：正倍率同时缩放位置和尺寸，以原点为中心，容器递归作用于全部子孙；不缩放 stroke-width 或文字字体大小。
- set <id> <attr> <value>：公共属性 fill/stroke/stroke-width，加各图形自身的几何属性；text 额外支持 text 内容。id、transform 等白名单外属性拒绝修改。
- tree [id]：显示全部图形或指定图形。
- show <id>：显示父节点、几何及样式属性和文本内容。
- save [file.svg]：首次必须给路径，成功后可省略并复用路径；init 成功后清空旧路径。已有文件会被替换，父目录须存在。
- help：查看语法。

画布尺寸为正有限数；几何尺寸及半径非负；坐标允许负数。
以 # 开头的整行是注释，命令中的十六进制颜色不会被截断。
带空格的路径或文字使用双引号；文字可为空。输入 EOF 或 Ctrl+C 退出。

## 容器操作体验

在 CLI 中输入：

```text
init 400 240
create g scene
create g node in scene
create rect card 30 40 120 60 orange in node
create text label 50 75 "Hello" in node
move node 100 50
tree
show label
save demo.svg
```

矩形和文字一起移动到右下方。保存后在浏览器刷新即可检查。
整套容器示例可用 Get-Content -Encoding UTF8 examples/groups.txt | npm run cli 回放。

普通组的 fill/stroke 按 SVG 继承，子图形显式设置的样式优先。解组按结构提升子节点，不复制被移除组的样式。

## 尚未完成

删除、z-order、canvas、撤销重做、SVG 读取。
save 对历史的屏障行为将在历史模块阶段实现。

架构与过程记录见 [doc/README.md](doc/README.md)。
