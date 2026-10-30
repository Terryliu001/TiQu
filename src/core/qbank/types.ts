/** 内置题库：按专题成册，每册是一组真题。 */

export interface BankQuestion {
  id: string;
  /** 题号（如「1」「二.1」）。 */
  no: string;
  /** 考点标签。 */
  point: string;
  /** 来源（学年学期 / 阶段 / 题号）。 */
  source: string;
  /** 题干，Markdown + LaTeX。 */
  stem: string;
  /** 参考答案 / 提示，可省略。 */
  answer?: string;
}

export interface BankBook {
  id: string;
  /** 册序号，如「第一册」。 */
  index: string;
  title: string;
  subtitle: string;
  /** 书脊主色。 */
  color: string;
  questions: BankQuestion[];
}

export interface QuestionBank {
  books: BankBook[];
}
