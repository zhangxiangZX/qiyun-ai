"""Expert-validity form for 3 public-opinion researchers (highlighted clause)."""

from __future__ import annotations

from pathlib import Path

FORM_MD = """# 专家效度评定表（3 名舆情研究领域专家）

请对「变量操作化方案」与「假设推导逻辑」打分（1=非常不合理，5=非常合理），并填写修改意见。研究设计将根据专家意见优化。

| 专家 | 单位/方向 | 变量操作化方案（1-5） | 假设推导逻辑（1-5） | 是否建议进入分析 | 主要意见 |
| --- | --- | --- | --- | --- | --- |
| 专家1 |  |  |  |  |  |
| 专家2 |  |  |  |  |  |
| 专家3 |  |  |  |  |  |

评定对象（高亮方法已实现部分）：

1. LDA 主题（意见领袖文本 / 网民评论）
2. SnowNLP 情感均值（倾向）与标准差（极化）；10% 双人编码 Kappa ≥ 0.8
3. 转发与 @ 网络的度/中介/接近中心性作为结构影响力
4. PROCESS Model 4：特质 → 信息接触频率 → 网民情感；生命周期阶段为调节，Bootstrap 5000
"""

FORM_COLUMNS = [
    "expert_id",
    "affiliation",
    "operationalization_score",
    "hypothesis_logic_score",
    "approve",
    "comments",
]


def write_expert_form(path_md: Path, path_csv: Path) -> None:
    path_md.parent.mkdir(parents=True, exist_ok=True)
    path_md.write_text(FORM_MD, encoding="utf-8")
    header = ",".join(FORM_COLUMNS)
    rows = [header] + [f"专家{i},,,,," for i in range(1, 4)]
    path_csv.write_text("\n".join(rows) + "\n", encoding="utf-8")
