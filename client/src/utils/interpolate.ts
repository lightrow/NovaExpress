// -50% --------- 0%-----30%-----60%----100%
// -1.5 ----@--- -1 -------- 0 --------- 1
export const interpolate = (
  x: number,
  config: {
    from: [number, number];
    to: [number, number];
    clamp?: boolean;
  }
) => {
  const handlePair = (
    x: number,
    {
      from,
      to,
      clamp,
    }: {
      from: [number, number];
      to: [number, number];
      clamp?: boolean;
    }
  ) => {
    let pos = x;
    if (clamp) {
      if (from[1] - from[0]) {
        pos = Math.min(Math.max(pos, from[0]), from[1]);
      } else {
        pos = Math.max(Math.min(pos, from[0]), from[1]);
      }
    }
    const progress = (pos - from[0]) / (from[1] - from[0]);
    const res = progress * (to[1] - to[0]) + to[0];
    return res;
  };

  return handlePair(x, config);
};
