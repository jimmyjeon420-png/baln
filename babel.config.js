module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // Production 환경에서 console.log 자동 제거
  // console.error와 console.warn은 유지 (에러 추적 및 경고용)
  if (process.env.NODE_ENV === 'production') {
    plugins.push([
      'transform-remove-console',
      {
        exclude: ['error', 'warn'],
      },
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};