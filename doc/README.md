# 架构方案与开发记录

## 架构方案

### 模块划分

当前已建立 cli、application、domain、infrastructure 和启动入口。模块目录齐备，但功能仍按阶段实现。

| 模块 | 职责 |
| --- | --- |
| src/cli | REPL、分词、显示输出，不包含图形规则 |
| src/application | 命令执行、编辑会话、历史管理，以及文件存储接口 |
| src/domain | 图形类、文档树、id 唯一性与层级约束 |
| src/infrastructure | SVG 解析、序列化和文件读写，实现 application 的存储接口 |
| src/main.ts | 组装对象和依赖，启动程序 |

组件图（PlantUML 源码）：

```plantuml
@startuml
component "cli" as CLI
component "application" as APP
component "domain" as DOMAIN
component "infrastructure" as INFRA
component "main (composition root)" as MAIN
CLI --> APP
APP --> DOMAIN
INFRA --> DOMAIN
INFRA --> APP : implements storage interface
MAIN --> CLI
MAIN --> APP
MAIN --> INFRA
@enduml
```

### 设计模式的选择

- Command：将用户操作封装为命令对象。当前已有 HelpCommand、InitCommand、CreateCommand、TreeCommand、SaveCommand、MoveCommand、ScaleCommand、SetCommand、ShowCommand，由 CommandDispatcher 统一创建并执行；可撤销协议和历史管理尚未实现。
- Composite（计划）：Shape 抽象类统一图形操作，Group 管理子图形并递归委派操作。
- Factory：ShapeFactory 集中完成类型名到图形类的创建映射，当前注册 rect、circle、ellipse、line、text；容器 g 待实现。
- Memento（待验证）：优先评估快照式撤销，用空间换取结构操作的恢复可靠性。

仅允许在命令分发与图形工厂中按名字分派。这两处为显式待重构点；当前已集中到 CommandDispatcher 与 ShapeFactory，其他业务代码不按图形类型名分派。

### 依赖方向规则

- cli 可依赖 application；不直接操作领域对象或文件系统。
- application 可依赖 domain；不依赖 cli 或具体 infrastructure 实现。
- domain 不依赖其他业务层，也不执行终端或文件 IO。
- infrastructure 可依赖 domain，以及 application 定义的存储接口。
- main 为组装入口，可依赖上述模块。
- 当前使用 Node.js readline 与流接口的代码只出现在 cli 和入口。

### 变化点假设

1. 新图形类型：通过图形多态和集中工厂降低修改范围；本阶段不实现插件加载器与 box。
2. 新交互入口：命令行与应用操作分离，为未来 GUI 或其他入口保留复用空间。
3. 文件格式或存储方式：通过存储接口隔离具体 SVG 和文件 IO。
4. 撤销策略：集中于历史管理模块；先保证正确性，不提前优化为增量日志。

### 待明确的需求

- group 跨父容器时，新组的父级、插入位置与相对顺序。
- 外部 SVG 的 transform、不支持标签及其他非白名单属性的处理范围。
- 普通 g 的 set 样式采用 SVG 容器属性语义；是否有额外传播要求需核对。
- 示例保存的元素计数有不一致，以明确的计数规则和实际结构为准。

## 过程记录

### 2026-10-23：项目初始化

- 与 AI 共同阅读需求，确认本阶段实现六种内置图形，不实现 box 与插件系统。
- 用户要求分步提交；本阶段只建立骨架，验证后由用户进行第一次提交。
- 已检查本机环境：Node.js 22.14.0、npm 11.12.1、Git 2.43.0。
- 建立交互层、应用层的最小入口，先使用 help 验证 REPL，避免将全部功能一次性生成。
- 注意：当前架构图是目标方案，尚未创建的模块在模块划分中明确标注。

### 2026-10-23：最小图形模型与命令

- 确认第一次初始化提交已完成，本阶段开始时工作区干净。
- 增加封装字段的 Shape、Rect、SvgDocument；抽象基类提供类型与描述的多态接口。当前文档为平面集合，Composite 子树将在容器阶段实现。
- 增加 EditorSession、CommandDispatcher、ShapeFactory，以及 InitCommand、CreateCommand、TreeCommand。
- Cli 仅负责分词、转交命令、输出与错误边界；启动入口负责组装依赖。
- 分词器只忽略以 # 开头的整行，不截断 #ffffff；支持双引号和引号内的反斜杠、双引号转义，普通 Windows 路径反斜杠保持不变。
- 代码自查时把 CreateCommand 中固定写死的 rect 成功反馈改为通过 Shape.getType() 获取，避免扩展图形时遗留矩形专用逻辑。
- 对失败原子性采取“校验完成后再修改”：init 先构造有效文档才替换，create 先完整构造有效图形再检查并加入集合。
- 本阶段约定：画布尺寸必须为正有限数；矩形宽高非负（允许零），坐标可为负数；init 只提供宽度时高度默认 600。数字支持十进制和科学计数法，拒绝空串、十六进制与非有限数。
- 仅实现 help、init、create rect、tree [id]；容器、其他形状、编辑、历史和文件 IO 尚未完成。
- 验证：npm run typecheck、npm test 全部通过。4 组测试覆盖分词、领域约束、命令状态和真实 CLI；命令测试逐项确认 15 类失败输入不改变文档。git diff --check 通过。
- Git 只在受限环境报告用户身份与仓库所有者不同，切换正常用户环境完成检查，未修改全局 safe.directory 配置。

### 2026-10-23：SVG 保存与可视化验收

- 用户希望看到画布，因而调整实现顺序：先完成 save，将内存模型转换为可在浏览器中查看的 SVG，再扩展其他图形和编辑操作。第二次功能提交已完成，本阶段开始时工作区干净。
- 新增 application/DocumentStore 存储接口，由 infrastructure/SvgFileStore 实现，main 注入分发器；应用层不导入 node:fs 或具体存储类。
- 新增 SaveCommand、SvgWriter、XmlEncoder。Shape.getAttributes 返回属性快照，Rect 多态提供自己的几何属性；修改返回的快照不影响内部状态。文件格式化、XML 转义与磁盘 IO 均在 infrastructure。
- 省略 fill 时不写出该属性，遵循 SVG 默认。XML 属性中的特殊字符和空白进行转义，非法 XML 1.0 字符拒绝输出。
- 序列化先完成，再将内容写入目标目录中的唯一临时文件，写入和关闭成功后用 rename 替换目标；失败清理临时文件并输出 cannot write file，避免直接截断旧文件。此策略不宣称提供断电恢复保证。
- 文件路径只有保存成功后才更新。init 成功会清空路径，失败不清空。当前尚无 read，因此无参数 save 可复用最近一次成功保存的路径；后续 read 成功时也需设置默认路径。
- 使用 examples/rectangles.txt 通过真实 CLI 生成 examples/rectangles.svg。浏览器截图确认左侧红色矩形位于 (30,40)、尺寸 100×60，右侧蓝色矩形位于 (160,40)、尺寸 80×60，符合命令输入。临时 HTTP 服务仅用于验收，日常直接打开 SVG 文件即可。
- 验证通过：npm run typecheck、npm test，累计 8 组测试；新增覆盖 XML 输出、缺省 fill、属性快照隔离、中文及带空格路径、覆盖旧文件、非法 XML 不破坏旧文件、临时文件清理、保存失败后默认路径及文档不变、init 路径重置与真实 CLI 保存。
- 当前未实现 read、其他图形、容器、编辑和撤销重做。IO 后禁止撤销的规则将在历史模块实现，不能把当前 save 视为 Phase 1 全部完成。

### 2026-10-23：五种叶子图形与基础编辑

- 第三次提交已完成，本阶段开始时工作区干净。新增 Circle、Ellipse、Line、Text，内置叶子类型现为 rect/circle/ellipse/line/text；g 与 Composite 留到下一阶段。
- 为避免每个图形重复实现几何校验，引入具有私有状态和行为的 Geometry 类：按各图形给定的几何属性、非负约束及坐标轴定义处理编辑。Shape 统一管理样式，具体图形通过类和多态描述自身，无按类型分派的编辑逻辑。
- NumberValue 在领域层统一数字解析，application/Arguments 复用它，避免 create 与 set 接受不同格式。没有引入 domain 对 application 的依赖。
- 新增 MoveCommand、ScaleCommand、SetCommand、ShowCommand。所有叶子支持公共样式与自身几何白名单，只有 Text 支持 text 属性；id、transform、font-size 等不在本阶段 set 白名单中。
- 明确 scale 是关于原点的几何缩放：全部位置与尺寸同乘倍率，包含直线两端点；文字只缩放 x/y，字体尺寸与描边宽度不属于要求中的几何属性，保持不变。
- 处理失败原子性时考虑了多坐标运算溢出：Geometry 先计算完整候选状态，校验有限性与尺寸约束，再整体替换。禁止逐个更新坐标后才检查后续值。
- SVG 序列化通过 getTextContent 多态获取文字，输出为子文本并转义；未将文字误存为属性，序列化中无 switch(tag)。空文字也输出合法 text 元素。
- 验证：npm test 累计 16 组检查通过，npm run typecheck 通过。新增覆盖五类移动与缩放、两端点、非正倍率、溢出回滚、属性白名单、负半径与尺寸、文字和空文字编辑、缺省样式、XML 内容转义。
- 用真实 CLI 回放 examples/shapes.txt，生成 examples/shapes.svg；XML 解析确认五个元素。浏览器验收看到矩形、缩放后的圆、有描边的椭圆、直线和包含 & 的标题，未见 XML 错误或文字截断。
- 仍未实现容器、in、分组、删除、z-order、canvas、历史及 read；这些功能按后续提交逐项推进。

## 一致性自查

- 当前实际目录与目标架构的四个模块一致；infrastructure 已实现 SVG 写出和文件保存，读取待实现。
- 抽样检查新增 import：Cli 仅依赖应用层分发器，application 依赖 domain，domain 只依赖本层；未出现反向业务依赖。新增 SvgFileStore 依赖 application 的 DocumentStore 接口与 domain，具体实现由 main 注入；保存命令不依赖 node:fs。Shape.describe 是无 IO 的领域描述，树形连接符由 TreeCommand 负责。
- 后续每阶段复核新增依赖并记录架构修订。

## 质量保证手段

初始化阶段通过类型检查、构建和 CLI 冒烟检查。第二阶段通过 npm run typecheck 和 npm test（先编译，再运行 4 组自动测试），覆盖分词、唯一 id、尺寸约束、默认参数、创建顺序、tree 输出，以及非法命令后的状态保持。真实 CLI 子进程验证报错后继续处理、注释、颜色和 EOF。测试使用 Node.js 内置 test/assert，不新增测试框架依赖。

后续重点验证：失败时文档与历史不变、嵌套容器操作、层级与顺序恢复、历史屏障、SVG 读写往返、id 补全与冲突、典型会话回放。
