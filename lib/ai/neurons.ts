// Cloudflare Workers AI 뉴런 단가 계산 (순수 함수, 서버·클라이언트 공용).
// 스텝 요금은 이미지 1장이 아니라 타일마다 붙는다 (네이버 문서 7-12와 동일한 함정 유형).
export function neuronsPerImage(steps: number, size = 1024): number {
  const tiles = Math.max(1, Math.round((size / 512) * (size / 512)));
  const clampedSteps = Math.min(Math.max(steps, 1), 8);
  return tiles * (4.8 + clampedSteps * 9.6);
}

export function formatNeurons(n: number): number {
  return Math.round(n);
}
