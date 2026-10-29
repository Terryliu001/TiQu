/**
 * 数学分析知识词条种子数据。
 *
 * - 15 个章节，各自一个低饱和主题色，色系整体和谐（暖冷交替、亮度接近）。
 * - 74 个词条，覆盖本科数学分析主干；body 用 Markdown + LaTeX，
 *   一律用 `String.raw` 书写以保留反斜杠（LaTeX 必需）。
 * - 同章内用「相邻成链」自动连边；CROSS_LINKS 提供跨章节概念桥。
 *
 * 用户新建/编辑/删除走覆盖层（见 store/knowledge.ts），不会改动这里。
 */
import type { Chapter, Term, CrossLink } from './types';

export const CHAPTERS: Chapter[] = [
  { id: 'ch01', name: '实数与集合', color: '#2F6F8F' },
  { id: 'ch02', name: '数列极限', color: '#3E8E7E' },
  { id: 'ch03', name: '函数极限与连续', color: '#6B8E23' },
  { id: 'ch04', name: '导数与微分', color: '#B8860B' },
  { id: 'ch05', name: '微分中值定理与导数应用', color: '#C0623E' },
  { id: 'ch06', name: '不定积分', color: '#9B4D8F' },
  { id: 'ch07', name: '定积分与微积分基本定理', color: '#4C6FB0' },
  { id: 'ch08', name: '定积分应用与广义积分', color: '#2E8B7F' },
  { id: 'ch09', name: '微分方程', color: '#A0522D' },
  { id: 'ch10', name: '数项级数与幂级数', color: '#7A6F9B' },
  { id: 'ch11', name: '多元函数微分学', color: '#5C8A5C' },
  { id: 'ch12', name: '重积分', color: '#C98A2B' },
  { id: 'ch13', name: '曲线积分与曲面积分', color: '#B5536B' },
  { id: 'ch14', name: '含参积分与一致收敛', color: '#4F8A9C' },
  { id: 'ch15', name: '傅里叶级数', color: '#8C6D3F' },
];

export const TERMS: Term[] = [
  // ───────────────────────── ch01 实数与集合 ─────────────────────────
  {
    id: 'real-numbers',
    name: '实数系',
    chapter: 'ch01',
    summary: '有理数与无理数的并集，对极限运算封闭，是数学分析的舞台。',
    body: String.raw`实数系 $\mathbb{R}$ 是有理数集 $\mathbb{Q}$ 与无理数集的并集，具备**有序性、稠密性、阿基米德性**与**连续性（完备性）**。

连续性最常见的等价刻画是**戴德金分割**：任一将 $\mathbb{R}$ 分成非空两部分的分割，必存在一个分界实数。这是极限理论能成立的根基。`,
  },
  {
    id: 'bounds',
    name: '上界与下界',
    chapter: 'ch01',
    summary: '集合被某个实数从上方/下方约束。',
    body: String.raw`设 $S\subset\mathbb{R}$。若存在 $M$ 使 $\forall x\in S,\ x\le M$，则称 $M$ 为 $S$ 的**上界**，$S$ 有上界；类似定义**下界**。

既有上界又有下界的集合称为**有界集**：存在 $K>0$ 使 $|x|\le K$ 对所有 $x\in S$ 成立。`,
  },
  {
    id: 'sup-inf',
    name: '上确界与下确界',
    chapter: 'ch01',
    summary: '最小的上界与最大的下界，未必属于原集合。',
    body: String.raw`集合 $S$ 的**上确界** $\sup S$ 是满足“① 是上界；② 任意更小的数都不是上界”的实数；**下确界** $\inf S$ 对偶定义。

实数的完备性保证：有上界的集合必存在上确界（上确界原理）。注意 $\sup S$ 不一定属于 $S$，例如 $\sup(0,1)=1\notin(0,1)$。`,
  },
  {
    id: 'neighborhood',
    name: '邻域',
    chapter: 'ch01',
    summary: '以某点为中心的对称开区间，极限的本地视角。',
    body: String.raw`点 $a$ 的 $\delta$ **邻域**为 $U(a,\delta)=\{x:|x-a|<\delta\}$。去掉中心得**去心邻域** $\mathring{U}(a,\delta)=\{x:0<|x-a|<\delta\}$。

邻域是描述“在某点附近”的语言，极限与连续的定义都建立在它之上。`,
  },
  {
    id: 'accumulation-point',
    name: '聚点',
    chapter: 'ch01',
    summary: '任意邻域内都有异于自身的点，极限过程的归属。',
    body: String.raw`点 $a$ 是集合 $E$ 的**聚点**（极限点），当且仅当 $a$ 的任一去心邻域都与 $E$ 相交。

聚点可能不属于 $E$（如 $0$ 是 $\{1/n\}$ 的聚点）。闭包 $\overline{E}=E\cup E'$ 其中 $E'$ 为全体聚点。`,
  },
  {
    id: 'open-closed-set',
    name: '开集与闭集',
    chapter: 'ch01',
    summary: '开集每点都有邻域在内；闭集包含全部聚点。',
    body: String.raw`若 $E$ 中每点都是**内点**（存在邻域完全含于 $E$），则 $E$ 为**开集**；若 $E$ 包含其全部聚点，则 $E$ 为**闭集**。

开集的余集是闭集，反之亦然。$\mathbb{R}$ 上既开又闭的集只有 $\varnothing$ 与 $\mathbb{R}$ 本身。`,
  },

  // ───────────────────────── ch02 数列极限 ─────────────────────────
  {
    id: 'seq-limit',
    name: '数列极限',
    chapter: 'ch02',
    summary: 'ε–N 语言：项最终任意接近极限值。',
    body: String.raw`$\lim_{n\to\infty}x_n=a$ 指：对任意 $\varepsilon>0$，存在 $N$，当 $n>N$ 时 $|x_n-a|<\varepsilon$。

也可写为 $x_n=a+o(1)$。几何意义：$a$ 的任意邻域外只有有限项。`,
  },
  {
    id: 'seq-unique',
    name: '极限唯一性',
    chapter: 'ch02',
    summary: '收敛数列的极限只有一个。',
    body: String.raw`若 $\lim x_n=a$ 且 $\lim x_n=b$，则 $a=b$。

证：由 $|a-b|\le|a-x_n|+|x_n-b|<2\varepsilon$ 对任意 $\varepsilon$ 成立，故 $a=b$。由此可推出**收敛数列必有界**。`,
  },
  {
    id: 'seq-squeeze',
    name: '夹逼定理',
    chapter: 'ch02',
    summary: '被两列夹在中间且两端收敛到同值。',
    body: String.raw`若 $y_n\le x_n\le z_n$ 且 $\lim y_n=\lim z_n=a$，则 $\lim x_n=a$。

典型应用：$\lim_{n\to\infty}\sqrt[n]{n}=1$，因 $1\le\sqrt[n]{n}\le\sqrt[n]{n^2}=(\sqrt[n]{n})^2\to1$。`,
  },
  {
    id: 'monotone-bounded',
    name: '单调有界定理',
    chapter: 'ch02',
    summary: '单调且有界的数列必收敛。',
    body: String.raw`单调递增且有上界的数列必收敛于其上确界；单调递减且有下界者收敛于下确界。

这是实数完备性的直接推论，也是构造 $e=\lim(1+1/n)^n$ 与证明确界存在性的常用工具。`,
  },
  {
    id: 'cauchy-seq',
    name: '柯西收敛准则',
    chapter: 'ch02',
    summary: '不依赖极限值本身的内蕴收敛判据。',
    body: String.raw`数列 $\{x_n\}$ 收敛 $\iff$ 对任意 $\varepsilon>0$，存在 $N$，当 $m,n>N$ 时 $|x_m-x_n|<\varepsilon$。

即“充分靠后的项彼此任意接近”。它把收敛判据化为数列自身的性质，是完备度量空间的定义性特征。`,
  },
  {
    id: 'subsequence',
    name: '子列',
    chapter: 'ch02',
    summary: '从原列中按递增下标抽取的列。',
    body: String.raw`设 $n_1<n_2<\cdots$，则 $\{x_{n_k}\}$ 是 $\{x_n\}$ 的**子列**。若原列收敛于 $a$，则其任一子列也收敛于 $a$。

反之，若某列有子列发散或两子列极限不同，则原列发散。子列是处理“极限是否存在”的利器。`,
  },

  // ───────────────────────── ch03 函数极限与连续 ─────────────────────────
  {
    id: 'fn-limit',
    name: '函数极限',
    chapter: 'ch03',
    summary: 'ε–δ 语言：自变量趋近时函数值趋近。',
    body: String.raw`$\lim_{x\to a}f(x)=A$ 指：对任意 $\varepsilon>0$，存在 $\delta>0$，当 $0<|x-a|<\delta$ 时 $|f(x)-A|<\varepsilon$。

也可描述 $x\to\infty$、$x\to a^+$ 等趋势。极限存在与 $f(a)$ 是否存在、等于何值**无关**。`,
  },
  {
    id: 'continuity',
    name: '连续函数',
    chapter: 'ch03',
    summary: '极限值等于函数值，图像可一笔画。',
    body: String.raw`$f$ 在 $a$ 连续指 $\lim_{x\to a}f(x)=f(a)$，即 $\forall\varepsilon>0,\exists\delta>0,\ |x-a|<\delta\Rightarrow|f(x)-f(a)|<\varepsilon$。

在定义域每点连续则称**连续函数**。连续函数的和、积、复合仍连续；基本初等函数在其定义域内连续。`,
  },
  {
    id: 'discontinuity',
    name: '间断点',
    chapter: 'ch03',
    summary: '连续性的破坏，分第一类与第二类。',
    body: String.raw`若 $f$ 在 $a$ 不连续，则 $a$ 为**间断点**。

- **第一类**：左右极限都存在。若相等但与 $f(a)$ 不等为**可去间断**；不等为**跳跃间断**。
- **第二类**：至少一侧极限不存在（如无穷、振荡），如 $1/x$ 在 $0$ 处。`,
  },
  {
    id: 'uniform-continuity',
    name: '一致连续',
    chapter: 'ch03',
    summary: 'δ 只与 ε 有关，不随点的位置变化。',
    body: String.raw`$f$ 在区间 $I$ 上**一致连续**：$\forall\varepsilon>0,\exists\delta>0$，对任意 $x,y\in I$，$|x-y|<\delta\Rightarrow|f(x)-f(y)|<\varepsilon$。

普通连续中 $\delta$ 可依赖 $x$；一致连续中 $\delta$ 对所有点统一。闭区间上的连续函数必一致连续（康托定理）。`,
  },
  {
    id: 'ivt',
    name: '介值定理',
    chapter: 'ch03',
    summary: '连续函数可取遍两端点之间的所有值。',
    body: String.raw`若 $f$ 在 $[a,b]$ 连续且 $f(a)\ne f(b)$，则对任意介于 $f(a),f(b)$ 之间的 $\mu$，存在 $\xi\in(a,b)$ 使 $f(\xi)=\mu$。

特例：若 $f(a)f(b)<0$，则存在零点 $\xi\in(a,b)$。这是方程求根的理论依据。`,
  },
  {
    id: 'two-important-limits',
    name: '两个重要极限',
    chapter: 'ch03',
    summary: '导数与指数增长的源头公式。',
    body: String.raw`$$\lim_{x\to0}\frac{\sin x}{x}=1,\qquad \lim_{x\to\infty}\left(1+\frac{1}{x}\right)^x=e.$$

由此推出等价无穷小 $\sin x\sim x$、$(1+x)^{1/x}\to e$，以及导数定义中 $\frac{e^h-1}{h}\to1$。`,
  },

  // ───────────────────────── ch04 导数与微分 ─────────────────────────
  {
    id: 'derivative',
    name: '导数',
    chapter: 'ch04',
    summary: '变化率的极限，切线的斜率为其几何意义。',
    body: String.raw`函数 $f$ 在 $x_0$ 的**导数**定义为
$$f'(x_0)=\lim_{h\to0}\frac{f(x_0+h)-f(x_0)}{h}=\lim_{x\to x_0}\frac{f(x)-f(x_0)}{x-x_0}.$$

存在则称为**可导**；可导必连续，反之不真（如 $|x|$ 在 $0$ 处）。几何上是曲线在该点切线的斜率。`,
  },
  {
    id: 'differential',
    name: '微分',
    chapter: 'ch04',
    summary: '函数增量的线性主部。',
    body: String.raw`若 $\Delta y=f(x_0+\Delta x)-f(x_0)=A\Delta x+o(\Delta x)$，则称 $A\Delta x$ 为**微分** $\mathrm{d}y=f'(x_0)\,\mathrm{d}x$。

微分是可导的等价说法，核心在于用线性近似替代非线性增量：当 $|\Delta x|$ 很小时 $\Delta y\approx\mathrm{d}y$。`,
  },
  {
    id: 'diff-rules',
    name: '求导法则',
    chapter: 'ch04',
    summary: '和、积、商、复合、反函数的求导公式。',
    body: String.raw`基本法则：
$$(uv)'=u'v+uv',\quad \left(\frac{u}{v}\right)'=\frac{u'v-uv'}{v^2},\quad (f\circ g)'=(f'\circ g)\cdot g'.$$

反函数导数：$(f^{-1})'(y)=1/f'(x)$。这些是把复杂函数拆开求导的工具。`,
  },
  {
    id: 'higher-deriv',
    name: '高阶导数',
    chapter: 'ch04',
    summary: '导数的导数，刻画弯曲与加速度。',
    body: String.raw`逐次求导得 $f''(x),f'''(x),\dots,f^{(n)}(x)$。莱布尼茨记法下高阶导数可表为
$$\frac{\mathrm{d}^n y}{\mathrm{d}x^n}=f^{(n)}(x).$$

二阶导数描述凹凸，物理中 $s''(t)$ 为加速度。高阶导也是泰勒展开的系数来源。`,
  },
  {
    id: 'implicit-diff',
    name: '隐函数求导',
    chapter: 'ch04',
    summary: '方程定义的函数直接两边对 x 求导。',
    body: String.raw`由方程 $F(x,y)=0$ 确定的 $y=y(x)$，可在等式两边对 $x$ 求导，把 $y$ 视为 $x$ 的函数：

例如 $x^2+y^2=1$ 两边求导得 $2x+2yy'=0$，故 $y'=-x/y$。

无需显化 $y$ 即可获得导数。`,
  },
  {
    id: 'log-diff',
    name: '对数求导法',
    chapter: 'ch04',
    summary: '对复杂幂指函数先取对数再求导。',
    body: String.raw`对形如 $y=u(x)^{v(x)}$ 或连乘连除的函数，先取对数：
$$\ln y=v\ln u\ \Rightarrow\ \frac{y'}{y}=v'\ln u+v\frac{u'}{u}.$$

于是 $y'=y\left(v'\ln u+\frac{vu'}{u}\right)$。幂指函数 $x^x$ 用此法最方便。`,
  },

  // ───────────────────────── ch05 中值定理与导数应用 ─────────────────────────
  {
    id: 'roll',
    name: '罗尔定理',
    chapter: 'ch05',
    summary: '端点等值的可导函数内部必有水平切线。',
    body: String.raw`若 $f$ 在 $[a,b]$ 连续、$(a,b)$ 可导且 $f(a)=f(b)$，则存在 $\xi\in(a,b)$ 使 $f'(\xi)=0$。

它是拉格朗日中值定理的特例，也是证明诸多结论（如根的存在性）的支点。`,
  },
  {
    id: 'lagrange-mvt',
    name: '拉格朗日中值定理',
    chapter: 'ch05',
    summary: '区间平均变化率等于某点瞬时变化率。',
    body: String.raw`若 $f$ 在 $[a,b]$ 连续、$(a,b)$ 可导，则存在 $\xi\in(a,b)$ 使
$$f'(\xi)=\frac{f(b)-f(a)}{b-a}.$$

推论：若 $f'\equiv0$ 则 $f$ 为常数；若 $f'\ge0$ 则 $f$ 单调不减。这是连接导数与函数整体行为的桥梁。`,
  },
  {
    id: 'lhopital',
    name: '洛必达法则',
    chapter: 'ch05',
    summary: '0/0 与 ∞/∞ 型未定式用导数比求极限。',
    body: String.raw`若 $\lim f=\lim g=0$（或 $\pm\infty$），且 $g'\ne0$，则
$$\lim\frac{f(x)}{g(x)}=\lim\frac{f'(x)}{g'(x)}$$

当右端极限存在时成立。可重复使用，也适用于 $0\cdot\infty$、$\infty-\infty$ 等经变形后的情形。`,
  },
  {
    id: 'taylor',
    name: '泰勒公式',
    chapter: 'ch05',
    summary: '用多项式在一点附近逼近函数。',
    body: String.raw`若 $f$ 在 $a$ 处 $n$ 阶可导，则
$$f(x)=\sum_{k=0}^{n}\frac{f^{(k)}(a)}{k!}(x-a)^k+R_n(x).$$

拉格朗日余项 $R_n=\frac{f^{(n+1)}(\xi)}{(n+1)!}(x-a)^{n+1}$。取 $a=0$ 即麦克劳林公式，是近似计算与极限估计的核心。`,
  },
  {
    id: 'extremum',
    name: '极值与最值',
    chapter: 'ch05',
    summary: '局部峰谷与全局最大最小。',
    body: String.raw`$f$ 在 $x_0$ 取**极值**指该点邻域内 $f(x_0)$ 最大或最小。**驻点**（$f'=0$）或不可导点才可能是极值点（费马引理）。

闭区间上的连续函数必有最大值与最小值，出现在端点或驻点处。`,
  },
  {
    id: 'convexity',
    name: '凹凸性与拐点',
    chapter: 'ch05',
    summary: '二阶导符号决定弯曲方向与转向点。',
    body: String.raw`若 $f''(x)>0$ 则曲线**凹**（向上凸），弦在图上方；$f''<0$ 则**凸**。

$f''$ 变号的点为**拐点**。凹凸性帮助画出函数图像并估计不等式，如由凹性得 Jensen 不等式。`,
  },

  // ───────────────────────── ch06 不定积分 ─────────────────────────
  {
    id: 'antideriv',
    name: '原函数与不定积分',
    chapter: 'ch06',
    summary: '导数逆运算，相差一个常数。',
    body: String.raw`若 $F'(x)=f(x)$，则 $F$ 是 $f$ 的**原函数**。$f$ 的全体原函数记为
$$\int f(x)\,\mathrm{d}x=F(x)+C,\quad C\in\mathbb{R}.$$

原函数存在（连续函数必有原函数），且任意两个原函数相差常数。这是定积分计算的基础。`,
  },
  {
    id: 'substitution',
    name: '换元积分法',
    chapter: 'ch06',
    summary: '链式法则的逆用，换变量化简被积式。',
    body: String.raw`第一换元（凑微分）：设 $u=\varphi(x)$，则
$$\int f(\varphi(x))\varphi'(x)\,\mathrm{d}x=\int f(u)\,\mathrm{d}u.$$

第二换元常用于根式，如三角代换 $x=a\sin t$ 处理 $\sqrt{a^2-x^2}$。`,
  },
  {
    id: 'parts',
    name: '分部积分法',
    chapter: 'ch06',
    summary: '乘积求导的逆用。',
    body: String.raw`由 $(uv)'=u'v+uv'$ 积分得
$$\int u\,\mathrm{d}v=uv-\int v\,\mathrm{d}u.$$

适用 $\int x^n e^x,\ \int \ln x,\ \int x\sin x$ 等。多次分部可递推，如 $\int e^{ax}\cos bx\,\mathrm{d}x$。`,
  },
  {
    id: 'rational-integral',
    name: '有理函数积分',
    chapter: 'ch06',
    summary: '分解为部分分式后逐项积分。',
    body: String.raw`有理函数可写为多项式加真分式，真分式按分母因式分解拆为
$$\frac{P(x)}{Q(x)}=\sum\frac{A}{(x-a)^k}+\sum\frac{Bx+C}{(x^2+px+q)^m}.$$

每一项都能用对数或反正切积出，故**任何有理函数都可表为初等函数积分**。`,
  },
  {
    id: 'trig-integral',
    name: '三角有理积分',
    chapter: 'ch06',
    summary: '万能代换把三角式化为有理式。',
    body: String.raw`对 $\sin x,\cos x$ 的有理式，令 $t=\tan(x/2)$ 有
$$\sin x=\frac{2t}{1+t^2},\ \cos x=\frac{1-t^2}{1+t^2},\ \mathrm{d}x=\frac{2}{1+t^2}\mathrm{d}t.$$

从而化为有理函数积分。半角、积化和差等技巧往往更省事。`,
  },

  // ───────────────────────── ch07 定积分与微积分基本定理 ─────────────────────────
  {
    id: 'riemann-sum',
    name: '定积分定义',
    chapter: 'ch07',
    summary: '分割—取点—求和—取极限的黎曼和。',
    body: String.raw`将 $[a,b]$ 分割为 $n$ 份，取点 $\xi_i\in[x_{i-1},x_i]$，做和 $S_n=\sum f(\xi_i)\Delta x_i$。当最大区间长趋零时极限存在，即
$$\int_a^b f(x)\,\mathrm{d}x=\lim_{\lambda\to0}\sum_{i=1}^n f(\xi_i)\Delta x_i.$$

该极限与分割、取点无关时称 $f$ **可积**；闭区间上的连续函数必可积。`,
  },
  {
    id: 'ftc',
    name: '微积分基本定理',
    chapter: 'ch07',
    summary: '求导与积分互为逆运算。',
    body: String.raw`若 $f$ 连续，定义 $F(x)=\int_a^x f(t)\,\mathrm{d}t$，则 $F'(x)=f(x)$；进而
$$\int_a^b f(x)\,\mathrm{d}x=F(b)-F(a)$$

其中 $F$ 为任一原函数。这一桥梁把“求面积”转化为“求原函数”，是整个积分学的枢纽。`,
  },
  {
    id: 'def-integral-prop',
    name: '定积分性质',
    chapter: 'ch07',
    summary: '线性、区间可加、保号与估值。',
    body: String.raw`主要性质：
$$\int_a^b(\alpha f+\beta g)=\alpha\int_a^b f+\beta\int_a^b g,\quad \int_a^b=\int_a^c+\int_c^b.$$

若 $f\ge0$ 则积分 $\ge0$；由 $m\le f\le M$ 得 $m(b-a)\le\int_a^b f\le M(b-a)$。保号性常用于不等式证明。`,
  },
  {
    id: 'def-substitution',
    name: '定积分换元',
    chapter: 'ch07',
    summary: '换变量时同步换积分上下限。',
    body: String.raw`设 $x=\varphi(t)$ 单调可导，则
$$\int_a^b f(x)\,\mathrm{d}x=\int_{\alpha}^{\beta} f(\varphi(t))\varphi'(t)\,\mathrm{d}t,\quad \varphi(\alpha)=a,\ \varphi(\beta)=b.$$

注意换元后**不必回代**，直接以新上下限计算，避免丢常数。`,
  },
  {
    id: 'integral-mvt',
    name: '积分中值定理',
    chapter: 'ch07',
    summary: '连续函数在某点取值代表整体平均。',
    body: String.raw`若 $f$ 在 $[a,b]$ 连续，则存在 $\xi\in[a,b]$ 使
$$\int_a^b f(x)\,\mathrm{d}x=f(\xi)(b-a).$$

即定积分等于“某点函数值 × 区间长度”。$f(\xi)$ 可理解为 $f$ 在 $[a,b]$ 上的平均值。`,
  },

  // ───────────────────────── ch08 定积分应用与广义积分 ─────────────────────────
  {
    id: 'area',
    name: '平面图形面积',
    chapter: 'ch08',
    summary: '上下曲线之差的积分。',
    body: String.raw`由 $y=f(x),y=g(x)$ 与 $x=a,b$ 围成的面积
$$A=\int_a^b|f(x)-g(x)|\,\mathrm{d}x.$$

极坐标下 $r=r(\theta)$ 与两射线围的面积 $A=\frac12\int_\alpha^\beta r^2(\theta)\,\mathrm{d}\theta$。`,
  },
  {
    id: 'volume',
    name: '旋转体体积',
    chapter: 'ch08',
    summary: '圆盘法或柱壳法。',
    body: String.raw`曲线 $y=f(x)\ge0$ 绕 $x$ 轴旋转得体积
$$V=\pi\int_a^b f(x)^2\,\mathrm{d}x \quad\text{（圆盘法）}.$$

绕 $y$ 轴则常用柱壳法 $V=2\pi\int_a^b x f(x)\,\mathrm{d}x$。`,
  },
  {
    id: 'arc-length',
    name: '弧长',
    chapter: 'ch08',
    summary: '曲线弧长的微元积分。',
    body: String.raw`平面曲线 $y=f(x)$ 在 $[a,b]$ 上的弧长
$$L=\int_a^b\sqrt{1+f'(x)^2}\,\mathrm{d}x.$$

参数式 $\gamma(t)=(x(t),y(t))$ 则 $L=\int\sqrt{x'^2+y'^2}\,\mathrm{d}t$。`,
  },
  {
    id: 'improper-integral',
    name: '反常积分',
    chapter: 'ch08',
    summary: '无限区间或无界函数的极限型积分。',
    body: String.raw`无限区间型：$\displaystyle\int_a^{+\infty}f=\lim_{b\to\infty}\int_a^b f$；无界函数型在奇点处取极限。

若极限存在且有限称**收敛**，否则**发散**。如 $\int_1^\infty \frac{1}{x^p}\,\mathrm{d}x$ 当 $p>1$ 收敛。`,
  },
  {
    id: 'gamma',
    name: '伽马函数',
    chapter: 'ch08',
    summary: '阶乘在正实数上的推广。',
    body: String.raw`$$\Gamma(s)=\int_0^\infty t^{s-1}e^{-t}\,\mathrm{d}t,\quad s>0.$$

满足递推 $\Gamma(s+1)=s\Gamma(s)$，故 $\Gamma(n+1)=n!$。另有 $\Gamma(1/2)=\sqrt{\pi}$，与概率、组合密切相关。`,
  },

  // ───────────────────────── ch09 微分方程 ─────────────────────────
  {
    id: 'ode-basic',
    name: '微分方程基本概念',
    chapter: 'ch09',
    summary: '含未知函数导数的等式，阶与解的定义。',
    body: String.raw`含未知函数及其导数的方程称**微分方程**。最高阶导数的阶为方程**阶**。

使方程恒等的函数称**解**；含任意常数且个数等于阶数的解叫**通解**，定出常数得**特解**。`,
  },
  {
    id: 'separable',
    name: '可分离变量方程',
    chapter: 'ch09',
    summary: '变量分置两侧各自积分。',
    body: String.raw`形如 $\frac{\mathrm{d}y}{\mathrm{d}x}=f(x)g(y)$ 的方程，分离得
$$\frac{\mathrm{d}y}{g(y)}=f(x)\,\mathrm{d}x\ \Rightarrow\ \int\frac{\mathrm{d}y}{g(y)}=\int f(x)\,\mathrm{d}x+C.$$

是最基础的一阶方程类型。`,
  },
  {
    id: 'first-linear',
    name: '一阶线性方程',
    chapter: 'ch09',
    summary: '积分因子法。',
    body: String.raw`标准形 $y'+P(x)y=Q(x)$。乘以积分因子 $\mu=e^{\int P\,\mathrm{d}x}$ 得
$$(\mu y)'=\mu Q\ \Rightarrow\ y=\frac{1}{\mu}\left(\int\mu Q\,\mathrm{d}x+C\right).$$

伯努利方程 $y'+P y=Q y^n$ 经 $z=y^{1-n}$ 化为此形。`,
  },
  {
    id: 'const-homo',
    name: '二阶常系数齐次',
    chapter: 'ch09',
    summary: '特征方程定基解。',
    body: String.raw`对 $y''+py'+qy=0$，特征方程 $r^2+pr+q=0$。

- 两异根 $r_1,r_2$：通解 $C_1e^{r_1x}+C_2e^{r_2x}$；
- 重根 $r$：通解 $(C_1+C_2x)e^{rx}$；
- 复根 $\alpha\pm i\beta$：通解 $e^{\alpha x}(C_1\cos\beta x+C_2\sin\beta x)$。`,
  },
  {
    id: 'const-nonhomo',
    name: '二阶常系数非齐次',
    chapter: 'ch09',
    summary: '齐次通解加一个特解。',
    body: String.raw`对 $y''+py'+qy=f(x)$，通解 = 对应齐次通解 + 一个**特解** $y^*$。

$f(x)=e^{\lambda x}P_m(x)$ 时用待定系数法设特解形式；$f$ 较一般时用**常数变易法**求 $y^*$。`,
  },

  // ───────────────────────── ch10 数项级数与幂级数 ─────────────────────────
  {
    id: 'series',
    name: '数项级数',
    chapter: 'ch10',
    summary: '无穷多项求和，收敛看部分和极限。',
    body: String.raw`级数 $\sum_{n=1}^\infty a_n$ 的部分和 $S_n=\sum_{k=1}^n a_k$。若 $\lim S_n=S$ 存在，称级数**收敛**于 $S$，否则**发散**。

级数是函数逼近、数值计算与傅里叶分析的基础语言。`,
  },
  {
    id: 'series-nec',
    name: '收敛必要条件',
    chapter: 'ch10',
    summary: '通项不趋于零必发散。',
    body: String.raw`若 $\sum a_n$ 收敛，则必有 $\lim_{n\to\infty}a_n=0$。

这是**必要条件**：反之不真（$a_n=1/n\to0$ 但调和级数 $\sum1/n$ 发散）。常用于快速判发散。`,
  },
  {
    id: 'positive-series',
    name: '正项级数审敛',
    chapter: 'ch10',
    summary: '比较、比值、根值判别法。',
    body: String.raw`正项级数部分和单调递增，有上界即收敛。

- **比较法**：与已知级数比较大小；
- **比值法**：$\lim a_{n+1}/a_n=\rho<1$ 收敛；
- **根值法**：$\lim\sqrt[n]{a_n}=\rho<1$ 收敛。`,
  },
  {
    id: 'alternating',
    name: '交错级数',
    chapter: 'ch10',
    summary: '莱布尼茨判别法。',
    body: String.raw`形如 $\sum(-1)^{n-1}b_n\ (b_n>0)$ 的**交错级数**，若 $b_n$ 单调递减趋于 $0$，则收敛。

余项满足 $|R_n|\le b_{n+1}$，故截断误差不超过第一项弃项，便于近似。`,
  },
  {
    id: 'abs-cond',
    name: '绝对收敛与条件收敛',
    chapter: 'ch10',
    summary: '绝对值收敛更强，且可重排。',
    body: String.raw`若 $\sum|a_n|$ 收敛称**绝对收敛**；$\sum a_n$ 收敛但 $\sum|a_n|$ 发散称**条件收敛**。

绝对收敛级数可任意重排而不改变和；条件收敛级数重排可得到任意给定的和（黎曼重排定理）。`,
  },
  {
    id: 'power-series',
    name: '幂级数',
    chapter: 'ch10',
    summary: '形如 Σ aₙ(x−a)ⁿ 的函数项级数。',
    body: String.raw`幂级数 $\sum_{n=0}^\infty a_n(x-a)^n$ 在其**收敛区间**内收敛于一个函数，且在内部可逐项求导、逐项积分。

它是把函数展开为多项式工具（如 $e^x,\sin x$）的理论载体。`,
  },
  {
    id: 'radius',
    name: '收敛半径',
    chapter: 'ch10',
    summary: '幂级数收敛的区间半径。',
    body: String.raw`存在 $R\ge0$ 使幂级数在 $|x-a|<R$ 内绝对收敛、$|x-a|>R$ 发散，$R$ 为**收敛半径**。

由比值/根值法：$R=\lim_{n\to\infty}\left|\frac{a_n}{a_{n+1}}\right|$ 或 $R=1/\lim\sqrt[n]{|a_n|}$。`,
  },

  // ───────────────────────── ch11 多元函数微分学 ─────────────────────────
  {
    id: 'multi-fn',
    name: '多元函数',
    chapter: 'ch11',
    summary: '多自变量映射到实数，定义域在空间中。',
    body: String.raw`$f:\mathbb{R}^n\supset D\to\mathbb{R}$，如 $f(x,y)=x^2+y^2$。极限要求**所有路径**趋于同值才存在。

连续性、偏导数等都是单变量概念在多维的推广，但行为更丰富（如可偏导未必连续）。`,
  },
  {
    id: 'partial',
    name: '偏导数',
    chapter: 'ch11',
    summary: '固定其余变量，对单变量求导。',
    body: String.raw`$$f_x(x_0,y_0)=\lim_{h\to0}\frac{f(x_0+h,y_0)-f(x_0,y_0)}{h},\quad f_y\text{ 类似}.$$

几何上是曲面与坐标面交线的切线斜率。可偏导**不能推出**连续。`,
  },
  {
    id: 'total-diff',
    name: '全微分',
    chapter: 'ch11',
    summary: '增量的最佳线性近似。',
    body: String.raw`若 $\Delta z=f(x+\Delta x,y+\Delta y)-f(x,y)=A\Delta x+B\Delta y+o(\rho)$，则
$$\mathrm{d}z=f_x\,\mathrm{d}x+f_y\,\mathrm{d}y,\quad \rho=\sqrt{\Delta x^2+\Delta y^2}.$$

可微必连续且可偏导，但可偏导且偏导连续才可微。`,
  },
  {
    id: 'gradient',
    name: '方向导数与梯度',
    chapter: 'ch11',
    summary: '梯度指向增长最快的方向。',
    body: String.raw`方向 $\mathbf{u}$ 上的方向导数 $\frac{\partial f}{\partial\mathbf{u}}=\nabla f\cdot\mathbf{u}$，其中
$$\nabla f=\left(\frac{\partial f}{\partial x_1},\dots,\frac{\partial f}{\partial x_n}\right).$$

梯度方向使方向导数最大，大小为 $|\nabla f|$。等高线沿梯度方向最陡。`,
  },
  {
    id: 'multi-extremum',
    name: '多元函数极值',
    chapter: 'ch11',
    summary: '驻点或不可微点才可能是极值点。',
    body: String.raw`$f$ 在 $(x_0,y_0)$ 取极值时，若可偏导则 $f_x=f_y=0$（驻点）。

用二阶判别：设 $A=f_{xx},B=f_{xy},C=f_{yy}$，$\Delta=AC-B^2>0$ 且 $A>0$ 为极小，$A<0$ 为极大；$\Delta<0$ 非极值。`,
  },
  {
    id: 'lagrange-multi',
    name: '条件极值与拉格朗日乘数',
    chapter: 'ch11',
    summary: '约束下求极值的乘数法。',
    body: String.raw`在约束 $g(x,y)=0$ 下求 $f$ 极值，构造
$$\mathcal{L}=f(x,y)-\lambda g(x,y),$$

令 $\nabla\mathcal{L}=0$ 即 $\nabla f=\lambda\nabla g$，联立约束解出候选点。推广到多个约束亦成立。`,
  },

  // ───────────────────────── ch12 重积分 ─────────────────────────
  {
    id: 'double-integral',
    name: '二重积分',
    chapter: 'ch12',
    summary: '平面区域上函数的体积式累加。',
    body: String.raw`在区域 $D\subset\mathbb{R}^2$ 上，
$$\iint_D f(x,y)\,\mathrm{d}\sigma=\lim_{\lambda\to0}\sum f(\xi_i,\eta_i)\Delta\sigma_i.$$

几何上是曲顶柱体体积；物理上是平面薄板的质量、转动惯量等。`,
  },
  {
    id: 'iterate-double',
    name: '化累次积分',
    chapter: 'ch12',
    summary: '二重积分化为两次单积分。',
    body: String.raw`若 $D=\{a\le x\le b,\ \varphi_1(x)\le y\le\varphi_2(x)\}$，则
$$\iint_D f\,\mathrm{d}\sigma=\int_a^b\left(\int_{\varphi_1(x)}^{\varphi_2(x)} f(x,y)\,\mathrm{d}y\right)\mathrm{d}x.$$

也可先对 $x$ 积分。正确写出积分限是关键，常配合画图。`,
  },
  {
    id: 'triple-integral',
    name: '三重积分',
    chapter: 'ch12',
    summary: '空间区域上的累加。',
    body: String.raw`在 $\Omega\subset\mathbb{R}^3$ 上，
$$\iiint_\Omega f(x,y,z)\,\mathrm{d}V=\lim\sum f(P_i)\Delta V_i.$$

用于求空间立体的质量、质心、转动惯量等。可化为“先一后二”或“先二后一”的累次积分。`,
  },
  {
    id: 'change-vars',
    name: '换元法',
    chapter: 'ch12',
    summary: '雅可比行列式修正面积微元。',
    body: String.raw`作变换 $(x,y)\to(u,v)$，则
$$\iint_D f(x,y)\,\mathrm{d}x\,\mathrm{d}y=\iint_{D'}|J|\,f(x(u,v),y(u,v))\,\mathrm{d}u\,\mathrm{d}v,$$

其中 $J=\frac{\partial(x,y)}{\partial(u,v)}$ 为雅可比行列式。极坐标、柱面、球面坐标都是其特例。`,
  },
  {
    id: 'multi-integral-app',
    name: '重积分应用',
    chapter: 'ch12',
    summary: '质量、质心、转动惯量、引力。',
    body: String.raw`面密度 $\rho$ 的薄板质量 $M=\iint_D\rho\,\mathrm{d}\sigma$，质心
$$\bar{x}=\frac{1}{M}\iint_D x\rho\,\mathrm{d}\sigma,\quad \bar{y}=\frac{1}{M}\iint_D y\rho\,\mathrm{d}\sigma.$$

转动惯量 $I=\iint_D r^2\rho\,\mathrm{d}\sigma$。空间情形用三重积分类推。`,
  },

  // ───────────────────────── ch13 曲线积分与曲面积分 ─────────────────────────
  {
    id: 'line-int-1',
    name: '第一类曲线积分',
    chapter: 'ch13',
    summary: '对弧长的积分，与方向无关。',
    body: String.raw`沿曲线 $L$ 对弧长积分：
$$\int_L f(x,y)\,\mathrm{d}s=\int_a^b f(x(t),y(t))\sqrt{x'^2+y'^2}\,\mathrm{d}t.$$

用于求曲线的质量（线密度 $\rho$ 时 $M=\int_L\rho\,\mathrm{d}s$）。`,
  },
  {
    id: 'line-int-2',
    name: '第二类曲线积分',
    chapter: 'ch13',
    summary: '对坐标的积分，与方向有关。',
    body: String.raw`$$\int_L P\,\mathrm{d}x+Q\,\mathrm{d}y=\int_a^b\left(Px'+Qy'\right)\mathrm{d}t.$$

表示变力沿路径作功。方向反转则变号，是向量场沿路径的累积。`,
  },
  {
    id: 'green',
    name: '格林公式',
    chapter: 'ch13',
    summary: '平面区域积分与边界线积分的桥。',
    body: String.raw`设 $D$ 由分段光滑闭曲线 $L$ 围成，则
$$\oint_L P\,\mathrm{d}x+Q\,\mathrm{d}y=\iint_D\left(\frac{\partial Q}{\partial x}-\frac{\partial P}{\partial y}\right)\mathrm{d}x\,\mathrm{d}y.$$

把沿闭路的第二类曲线积分化为区域上的二重积分。`,
  },
  {
    id: 'surface-int-1',
    name: '第一类曲面积分',
    chapter: 'ch13',
    summary: '对面积的积分，与侧无关。',
    body: String.raw`在曲面 $\Sigma$ 上：
$$\iint_\Sigma f\,\mathrm{d}S=\iint_D f(x(u,v),y(u,v),z(u,v))\,|\mathbf{r}_u\times\mathbf{r}_v|\,\mathrm{d}u\,\mathrm{d}v.$$

用于求曲面壳的质量（面密度 $\rho$ 时 $M=\iint_\Sigma\rho\,\mathrm{d}S$）。`,
  },
  {
    id: 'surface-int-2',
    name: '第二类曲面积分',
    chapter: 'ch13',
    summary: '对坐标的积分，依赖指定侧。',
    body: String.raw`$$\iint_\Sigma P\,\mathrm{d}y\,\mathrm{d}z+Q\,\mathrm{d}z\,\mathrm{d}x+R\,\mathrm{d}x\,\mathrm{d}y$$

表示向量场穿过曲面的通量，结果依赖曲面的**侧**（法向朝向）。`,
  },
  {
    id: 'gauss',
    name: '高斯公式',
    chapter: 'ch13',
    summary: '闭曲面通量等于体内散度的体积分。',
    body: String.raw`设 $\Omega$ 由闭曲面 $\Sigma$ 围成，取外侧，则
$$\oiint_\Sigma P\,\mathrm{d}y\,\mathrm{d}z+Q\,\mathrm{d}z\,\mathrm{d}x+R\,\mathrm{d}x\,\mathrm{d}y=\iiint_\Omega\left(\frac{\partial P}{\partial x}+\frac{\partial Q}{\partial y}+\frac{\partial R}{\partial z}\right)\mathrm{d}V.$$

即通量 = 散度在体内的总和。`,
  },

  // ───────────────────────── ch14 含参积分与一致收敛 ─────────────────────────
  {
    id: 'param-normal',
    name: '含参正常积分',
    chapter: 'ch14',
    summary: '积分上限或被积式含参数。',
    body: String.raw`形如 $I(y)=\int_a^b f(x,y)\,\mathrm{d}x$。若 $f$ 与 $f_y$ 连续，则可对参数求导：
$$\frac{\mathrm{d}}{\mathrm{d}y}\int_a^b f(x,y)\,\mathrm{d}x=\int_a^b \frac{\partial f}{\partial y}(x,y)\,\mathrm{d}x.$$

是“在积分号下求导”的基本情形。`,
  },
  {
    id: 'param-improper',
    name: '含参反常积分',
    chapter: 'ch14',
    summary: '无限区间上的含参积分，需一致收敛保性质。',
    body: String.raw`形如 $I(y)=\int_a^\infty f(x,y)\,\mathrm{d}x$。为使 $I(y)$ 连续、可积、可微，需要积分关于 $y$ **一致收敛**。

否则极限、积分、微分不能任意交换次序。`,
  },
  {
    id: 'uniform-test',
    name: '一致收敛判别',
    chapter: 'ch14',
    summary: '函数项级数/积分的一致收敛。',
    body: String.raw`函数项级数 $\sum u_n(x)$ 在 $I$ 上**一致收敛**：对任意 $\varepsilon>0$，存在与 $x$ 无关的 $N$，使 $n>N$ 时部分和余项一致小于 $\varepsilon$。

一致收敛时极限函数保留连续性、可逐项积分；逐项微分还需级数本身一致收敛。`,
  },
  {
    id: 'weierstrass-m',
    name: '魏尔斯特拉斯M判别法',
    chapter: 'ch14',
    summary: '用收敛数项级数控制各项。',
    body: String.raw`若存在常数 $M_n$ 使 $|u_n(x)|\le M_n$ 对所有 $x\in I$ 成立，且 $\sum M_n$ 收敛，则 $\sum u_n(x)$ 在 $I$ 上**绝对且一致收敛**。

是最常用的充分条件判别法。`,
  },
  {
    id: 'dini',
    name: '迪尼定理',
    chapter: 'ch14',
    summary: '单调收敛的连续函数列必一致收敛。',
    body: String.raw`若 $\{f_n\}$ 在紧集 $K$ 上连续、逐点收敛于连续函数 $f$，且对每个 $x$ 单调（关于 $n$），则收敛在 $K$ 上**一致**。

是少数能从“逐点”推出“一致”的漂亮结论。`,
  },

  // ───────────────────────── ch15 傅里叶级数 ─────────────────────────
  {
    id: 'trig-series',
    name: '三角级数',
    chapter: 'ch15',
    summary: '正弦余弦的无穷线性组合。',
    body: String.raw`形如
$$\frac{a_0}{2}+\sum_{n=1}^\infty\bigl(a_n\cos nx+b_n\sin nx\bigr)$$

的级数称为**三角级数**。三角函数系在 $[-\pi,\pi]$ 上正交，是正交函数展开的典型例子。`,
  },
  {
    id: 'fourier-coeff',
    name: '傅里叶系数',
    chapter: 'ch15',
    summary: '由正交性积分得到各项系数。',
    body: String.raw`对 $f$ 在 $[-\pi,\pi]$ 可积，系数
$$a_n=\frac{1}{\pi}\int_{-\pi}^\pi f(x)\cos nx\,\mathrm{d}x,\quad b_n=\frac{1}{\pi}\int_{-\pi}^\pi f(x)\sin nx\,\mathrm{d}x.$$

区间 $[-l,l]$ 上只需把 $n x$ 换成 $n\pi x/l$。`,
  },
  {
    id: 'fourier-series',
    name: '傅里叶级数展开',
    chapter: 'ch15',
    summary: '周期信号分解为谐波叠加。',
    body: String.raw`以傅里叶系数构造的三角级数称为 $f$ 的**傅里叶级数**，记作
$$f(x)\sim\frac{a_0}{2}+\sum_{n=1}^\infty(a_n\cos nx+b_n\sin nx).$$

在连续点收敛于 $f(x)$；它是信号处理与偏微分方程分离变量法的基石。`,
  },
  {
    id: 'dirichlet',
    name: '收敛定理',
    chapter: 'ch15',
    summary: '狄利克雷条件保证逐点收敛。',
    body: String.raw`若 $f$ 在 $[-\pi,\pi]$ 上**分段单调**且只有有限个极值点与第一类间断点，则其傅里叶级数在每点收敛于
$$\frac{f(x^+)+f(x^-)}{2}.$$

即左右极限的平均值；连续点处即为函数值。`,
  },
  {
    id: 'sine-cosine-series',
    name: '正弦级数与余弦级数',
    chapter: 'ch15',
    summary: '奇延拓得正弦，偶延拓得余弦。',
    body: String.raw`将 $[0,\pi]$ 上的函数作**奇延拓**得正弦级数（仅 $b_n$ 非零）；作**偶延拓**得余弦级数（仅 $a_n$ 非零）。

常用于只在一半区间上展开，且满足边界条件（如热方程）。`,
  },
];

/** 跨章节概念桥：连接不同章的词条，使图谱在章与章之间也连成网。 */
export const CROSS_LINKS: CrossLink[] = [
  { from: 'sup-inf', to: 'monotone-bounded', note: '确界是单调有界收敛的目标' },
  { from: 'seq-limit', to: 'fn-limit', note: '数列极限是函数极限的特例' },
  { from: 'neighborhood', to: 'continuity', note: '邻域定义连续' },
  { from: 'cauchy-seq', to: 'series-nec', note: '柯西列用于级数收敛' },
  { from: 'seq-squeeze', to: 'positive-series', note: '夹逼推动正项级数审敛' },
  { from: 'derivative', to: 'continuity', note: '可导必连续' },
  { from: 'derivative', to: 'lagrange-mvt', note: '导数是中值定理的输入' },
  { from: 'lagrange-mvt', to: 'lhopital', note: '中值定理导出洛必达' },
  { from: 'taylor', to: 'power-series', note: '泰勒展开是幂级数' },
  { from: 'ivt', to: 'roll', note: '介值是罗尔的前提' },
  { from: 'differential', to: 'total-diff', note: '一元微分推广到全微分' },
  { from: 'extremum', to: 'multi-extremum', note: '一元极值推广到多元' },
  { from: 'ftc', to: 'antideriv', note: '基本定理连接定积分与原函数' },
  { from: 'def-substitution', to: 'substitution', note: '定积分换元是不定积分换元的应用' },
  { from: 'improper-integral', to: 'param-improper', note: '反常积分推广为含参反常积分' },
  { from: 'gamma', to: 'param-improper', note: '伽马函数是指数型含参反常积分' },
  { from: 'volume', to: 'double-integral', note: '旋转体体积以重积分为推广' },
  { from: 'gradient', to: 'line-int-2', note: '梯度场沿路径积分得功' },
  { from: 'fourier-series', to: 'power-series', note: '两者都是函数项级数展开' },
  { from: 'uniform-test', to: 'weierstrass-m', note: 'M 判别法是一致收敛的充分条件' },
  { from: 'param-normal', to: 'partial', note: '含参积分依赖偏导' },
  { from: 'green', to: 'gauss', note: '格林公式是高斯公式的平面特例' },
];

const chapterMap = new Map(CHAPTERS.map((c) => [c.id, c]));
export function getChapter(id: string): Chapter {
  const c = chapterMap.get(id);
  if (!c) throw new Error(`未知章节: ${id}`);
  return c;
}
