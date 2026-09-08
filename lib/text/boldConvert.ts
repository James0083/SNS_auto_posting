// Instagram 캡션 입력창은 마크다운을 렌더링하지 않는다. `**단어**`를 그대로 붙여넣으면
// 별표가 문자 그대로 보인다 (docs/PROJECT_PLAN.md 7-3의 "★ 새로 발견한 잠재 함정" 참고).
//
// ⚠️ 구현하며 확인한 사실: 유니코드 "수학 알파벳 기호(Mathematical Alphanumeric Symbols)"
// 볼드체는 라틴 문자(A-Z, a-z)와 숫자(0-9)만 커버하고, 한글에 대응하는 볼드 코드포인트는
// 표준 유니코드에 존재하지 않는다. 즉 이 변환은 영문 단어·숫자에는 통하지만,
// 한글이 대부분인 릴스 본문에서는 "볼드"를 실제로 구현할 방법이 없다.
// → 한글이 섞인 구간은 볼드로 바꾸는 대신 별표만 제거해 문자가 깨져 보이는 것만 막는다.
// 이 사실은 반드시 사용자에게 알리고, 필요하면 다른 강조 방식(이모지로 감싸기 등)을 논의해야 한다.

const UPPER_START = "A".charCodeAt(0);
const LOWER_START = "a".charCodeAt(0);
const DIGIT_START = "0".charCodeAt(0);

const BOLD_UPPER = [..."𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭"];
const BOLD_LOWER = [..."𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇"];
const BOLD_DIGIT = [..."𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵"];

const HANGUL_RE = /[가-힣]/;

function boldChar(c: string): string {
  const code = c.charCodeAt(0);
  if (code >= UPPER_START && code < UPPER_START + 26) return BOLD_UPPER[code - UPPER_START] ?? c;
  if (code >= LOWER_START && code < LOWER_START + 26) return BOLD_LOWER[code - LOWER_START] ?? c;
  if (code >= DIGIT_START && code < DIGIT_START + 10) return BOLD_DIGIT[code - DIGIT_START] ?? c;
  return c; // 한글 등 그 외 문자는 볼드 변환 불가 — 원문 그대로 둔다
}

export function convertMarkdownBold(text: string): { text: string; hangulBoldSkipped: number } {
  let hangulBoldSkipped = 0;
  const converted = text.replace(/\*\*(.+?)\*\*/g, (_match, inner: string) => {
    if (HANGUL_RE.test(inner)) {
      hangulBoldSkipped++;
      return inner; // 별표만 제거, 볼드는 적용하지 않음
    }
    return [...inner].map(boldChar).join("");
  });
  return { text: converted, hangulBoldSkipped };
}
