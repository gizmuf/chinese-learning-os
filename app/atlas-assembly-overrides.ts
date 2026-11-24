// CNS 11643 records the graphic structure of 齐 as ⿱文⿰丿丨.
// The six Hanzi Writer strokes for standalone 齐 put 文 first, then 丿 and 丨.
// https://www.cns11643.gov.tw/wordView.jsp?ID=205680
export const assemblyOverrides: Readonly<Record<string, {ids: string; paths: string[]}>> = {
  齐: {ids: '⿱文⿰丿丨', paths: ['0', '0', '0', '0', '1.0', '1.1']},
};
