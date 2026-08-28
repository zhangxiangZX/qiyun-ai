# 舆情研究方法（仅高亮条款）

独立分析脚本，对应开题/方法稿中**青色高亮**段落。不接入 AI 云产品，不修改 `apps/*`。

## 范围（做 / 不做）

| 做（截图高亮） | 不做（未高亮） |
| --- | --- |
| LDA 对意见领袖文本、网民评论主题聚类 | 意见领袖—时间双向面板 |
| SnowNLP 情感赋值；均值=倾向、标准差=极化 | 个体/时间固定效应模型 |
| 随机 10% 双人编码，Kappa ≥ 0.8 | 第四节变量定义正文 |
| Gephi 可用的转发/@ 网络；度/中介/接近中心性 | 真实邀请 3 位专家（只提供评定表） |
| PROCESS Model 4 中介；生命周期阶段调节；Bootstrap 5000 | SPSS 商业软件本体（用等价统计量） |
| 描述统计（均值、标准差、极值）；Cronbach’s α ≥ 0.7 | |

路径约定（可改输入列名，见 `config.py`）：

- 中介 Model 4：意见领袖特质 X → 信息接触频率 M → 网民情感 Y
- 有中介的调节：舆情生命周期阶段 W 调节 X 对 M、Y 的路径（Hayes Model 8 形式），并按阶段分层比较系数

## 安装

```bash
cd research/opinion-analysis
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 运行

```bash
# 生成可复现样例数据（无真实舆情库时）
python run.py generate-sample

# 只跑高亮模块
python run.py run --data-dir data/sample --output-dir output

# 测试
python -m pytest tests -q
```

已 `pip install -e .` 时也可用 `python -m opinion_analysis ...`。

## 产出

| 文件 | 对应条款 |
| --- | --- |
| `lda_topics_leaders.csv` / `lda_topics_comments.csv` | LDA 主题 |
| `sentiment_scores.csv` / `sentiment_summary.csv` | SnowNLP 分值、均值、标准差 |
| `kappa_sample.csv` / `kappa_report.json` | 10% 抽样与 Kappa |
| `network.gexf` / `centrality.csv` | Gephi 网络 + 三种中心性 |
| `process_model4.json` / `moderated_mediation.json` | Model 4 与阶段调节、Bootstrap |
| `descriptives.csv` / `cronbach.json` | 描述统计与 α |
| `expert_validity_form.md` | 3 名专家效度评定表 |

## 已知限制

- 样例语料为合成数据，论文需替换为真实抓取文本与关系边。
- 中心性在 Python（NetworkX）计算，同时导出 `.gexf` 供 Gephi 可视化；不模拟 Gephi 点击操作。
- 专家效度只能产出评定表，不能代替真实函询。
- Bootstrap 默认 5000 次；测试中使用更少次数。
