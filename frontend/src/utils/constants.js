// ==========================================
// 全局常量定义
// ==========================================

export const DEFAULT_SETTINGS = {
  openaiBaseUrl: '', openaiApiKey: '', aiModel: 'gpt-3.5-turbo', aiTemperature: 0.7, apiProfiles: [],
  customSystemPrompt: '你是一个可爱的虚拟助手，请用简短、生动、带有一点二次元风格的语言回答我的问题。',
  worldviewText: '', worldviewProfiles: [],
  userName: '我', aiName: '对象', characterList: [], activeSkillPacks: [], ttsEnabled: false,
  ttsUrlTemplate: 'http://127.0.0.1:9880/tts?text={text}&text_lang={lang}&ref_audio_path={ref_audio}&prompt_text={ref_text}&prompt_lang={ref_lang}',
  ttsLanguage: 'zh', ttsVolume: 1.0, bgmVolume: 0.3, bgmMode: 'sequential', enableBgmToast: false,
  ttsMobileMode: false, enableMobileUI: false, mobileUIScale: 1.0,
  storySpriteScale: 1.0, storySpriteX: 0, storySpriteY: 0,
  live2dScale: 0.2, live2dX: 0, live2dY: 0, titleLive2dScale: 0.2, titleLive2dX: 0, titleLive2dY: 0,
  live2dResolution: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
  corsProxyType: 'none', customCorsProxyUrl: 'https://corsproxy.io/?', enablePlotOptions: false, enableStreaming: true, typingSpeed: 40, vnLinesPerPage: 4, dialogOpacity: 0.6, settingsOpacity: 0.95, currentBgId: null, currentBgmId: null, currentExpressionId: null, currentModelId: null,
  dialogFontFamily: '"Microsoft YaHei", sans-serif', dialogTextColor: '#ffffff', dialogThemeColor: '#000000', dialogPositionY: 0, dialogLineHeight: 1.8,
  enableClickExpression: true, enableNoLive2DMode: false, enableBridge: true, mainTitleText: 'GWC', mainTitleColor: '#e0f2fe', mainTitleFont: 'serif', mainTitleX: 0, mainTitleY: 0, subTitleText: '- GalGame Web Chat -', subTitleColor: '#dbeafe', subTitleFont: 'sans-serif', subTitleX: 0, subTitleY: 0, titleBgOffsetX: 0, titleBgOffsetY: 0, plotApiMode: 'shared', plotBaseUrl: '', plotApiKey: '', plotModel: 'gpt-3.5-turbo', hideTitleLive2d: false, ttsRefAudio: '', ttsRefText: '', ttsRefLang: 'zh', enableTranslation: false, displayLanguage: 'zh', ttsSentencePause: 0, ttsPlaybackRate: 1.0, workMode: false,
  opencodeBaseUrl: '', opencodeApiKey: '', opencodeModel: '', opencodeUseChatModel: true, opencodeUseFreeModel: false, opencodeProjectPath: 'WorkSpace',
  modelConfigs: {}, enableMemory: false, memoryInterval: 150, enableAutoSave: false, autoSaveInterval: 5, enableProactiveChat: false, proactiveMinInterval: 3, proactiveMaxInterval: 10, vnAutoPage: true, hideInfoToasts: false, enableFaceTracking: false, enableCameraPreview: false, faceTrackingMode: 'full', ttsFastMode: true, showTitleBgmPlayer: true,
  shortcuts: { save: true, load: true, quickSave: true, quickLoad: true, skip: true, bg: true, model: true, expression: true, memo: true, workMode: true, faceTracking: true, hideModel: true, bgm: true, plot: true, tts: true, log: true },
  enableVoiceInput: false, voiceInputKey: 'ControlRight', voiceInputLang: 'zh-CN', voiceInputMode: 'hold', voiceSilenceTimeout: 2.0, voiceInputPreview: true, voiceInputGlobal: false, voiceInputModelSize: 'base'
};

export const SHORTCUT_DEFS = [
  { id: 'save', label: '保存 (S)' }, { id: 'load', label: '读取 (L)' },
  { id: 'quickSave', label: '快存 (QS)' }, { id: 'quickLoad', label: '快读 (QL)' },
  { id: 'skip', label: '跳过 (SKIP)' }, { id: 'bg', label: '背景切换' },
  { id: 'model', label: '模型切换' }, { id: 'expression', label: '表情切换' },
  { id: 'memo', label: '备忘/日程' }, { id: 'workMode', label: '工作模式' },
  { id: 'faceTracking', label: '实时面捕' }, { id: 'hideModel', label: '模型显隐' },
  { id: 'bgm', label: 'BGM 控制' }, { id: 'plot', label: '推演选项' },
  { id: 'tts', label: 'Auto(TTS)' }, { id: 'log', label: 'Log 记录' }
];

export const hexToRgba = (hex, alpha) => {
  let r = 0, g = 0, b = 0;
  if (hex && hex.length === 4) { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); }
  else if (hex && hex.length === 7) { r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16); }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
