// 内置插件（仍以独立插件身份存在，可在插件管理中开关）
export const BUNDLED_MODS = [
  { id: 'bundled_video_bg', name: '动态视频背景插件', fileName: '动态视频背景插件.js' },
  { id: 'bundled_web_search', name: '联网搜索', fileName: '联网搜索.js' },
];

// 已并入程序主体、不再作为插件存在的旧内置插件 ID。
// 老用户的插件列表里可能残留这些条目，需要在初始化时清理，
// 否则会在插件管理中显示为一个既无法工作、也无法卸载的空壳。
export const MERGED_INTO_CORE_IDS = ['bundled_script_dlc', 'bundled_sprite_dlc'];
