import React from 'react';
import { useApp } from '../../contexts/AppContext';
import SettingToggle from '../ui/SettingToggle';
import SettingSlider from '../ui/SettingSlider';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import { Eye, Upload, Trash2, RefreshCw, Image as ImageIcon, Monitor, Database } from 'lucide-react';

export default function VisualTab() {
  const {
    settings, setSettings,
    handleBgUpload, removeBg, handleTitleBgUpload, clearTitleBgImage,
    handleModelUpload, handleZipModelUpload, switchModel, removeModel,
    handleEnterVisualAdjust, handleResetFocus, handleFullscreen, handleOfflineEngineUpload,
    modelsList, bgList, localTitleBgImage,
    setModelReloadTrigger, updateModelConfig
  } = useApp();

  // 获取当前模型的独立配置
  const currentModelConfig = settings.modelConfigs?.[settings.currentModelId] || { scale: settings.live2dScale || 0.2, x: settings.live2dX || 0, y: settings.live2dY || 0, titleScale: settings.titleLive2dScale || 0.2, titleX: settings.titleLive2dX || 0, titleY: settings.titleLive2dY || 0 };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* UI 布局适配 */}
      <SettingSectionTitle title="UI 布局适配 (Mobile UI)" />
      <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm mb-6">
        <SettingToggle label="开启手机端紧凑布局适配" value={settings.enableMobileUI} onChange={v => setSettings({...settings, enableMobileUI: v})} />
        {settings.enableMobileUI && (
          <div className="pt-4 mt-4 border-t border-dashed border-[#e6d5b8]">
            <SettingSlider label="紧凑布局全局等比缩放 (Scale)" value={settings.mobileUIScale || 1.0} min={0.5} max={1.5} step={0.05} suffix="x" onChange={v => setSettings({...settings, mobileUIScale: v})} />
          </div>
        )}
        <p className="text-xs text-[#7a6b5d] mt-3 leading-relaxed">开启后，将大幅压缩对话框、输入框和快捷栏的内边距与字体大小，专门优化手机竖屏及横屏模式下的视野遮挡问题。</p>
        <div className="pt-4 mt-4 border-t border-dashed border-[#e6d5b8]">
          <SettingToggle label="隐藏系统弹窗提示（插件加载等，报错弹窗正常显示）" value={settings.hideInfoToasts} onChange={v => setSettings({...settings, hideInfoToasts: v})} />
          <p className="text-xs text-[#7a6b5d] mt-2">开启后将隐藏 info/success 类型的提示弹窗，error 类型的报错仍会显示。</p>
        </div>
      </div>

      {/* Live2D 模型管理 */}
      <SettingSectionTitle title="Live2D 模型管理" extra={
        <>
          <label className="flex items-center gap-1 px-4 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white text-xs font-bold rounded-full transition-colors shadow-sm cursor-pointer"><Database size={14}/> 离线引擎<input type="file" accept=".js,.txt" hidden onChange={handleOfflineEngineUpload} /></label>
          <button onClick={handleFullscreen} className="flex items-center gap-1 px-4 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Monitor size={14}/> 全屏</button>
          <button onClick={() => handleEnterVisualAdjust('model')} className="flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={14}/> 预览调整</button>
        </>
      } />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
          <label className="block font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> Live2D 模型库管理 (支持多模型)</label>
          <p className="text-xs text-[#7a6b5d] mb-4 leading-relaxed">选择包含 <code>.model3.json</code> 的模型文件夹。导入后可在底栏快速切换。</p>
          <div className="flex flex-col gap-2 mb-4">
            <input type="file" webkitdirectory="true" directory="true" multiple onChange={handleModelUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#c44a4a] file:text-white hover:file:bg-[#a63d3d] cursor-pointer"/>
            <label className="block w-full text-sm text-center font-bold bg-[#4fa0d8] text-white hover:bg-[#3b82f6] rounded-full py-2 px-4 cursor-pointer shadow-sm transition-colors">
              📦 导入 ZIP 模型包 (安卓兼容)
              <input type="file" accept=".zip" hidden onChange={handleZipModelUpload} />
            </label>
          </div>
          {modelsList.length > 0 && (
            <div className="max-h-32 overflow-y-auto bg-white rounded-lg p-2 border border-[#e6d5b8] space-y-1">
              {modelsList.map(m => (
                <div key={m.id} className={`flex justify-between items-center px-3 py-2 rounded text-xs group transition-colors ${settings.currentModelId === m.id ? 'bg-[#c44a4a]/10 font-bold text-[#c44a4a]' : 'hover:bg-black/5 text-[#7a6b5d]'}`}>
                  <span className="truncate pr-4 flex-1 cursor-pointer" onClick={() => { switchModel(m.id); setModelReloadTrigger(p => p + 1); }}>{settings.currentModelId === m.id ? '✨ ' : ''}{m.name}</span>
                  <button onClick={() => removeModel(m.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 px-2 shrink-0"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm flex flex-col justify-center gap-4">
          <div>
            <SettingToggle label="隐藏游戏内的 Live2D 模型" value={settings.hideLive2dModel} onChange={v => setSettings({...settings, hideLive2dModel: v})} />
            <p className="text-xs text-[#7a6b5d] mt-2">开启后将隐藏游戏主界面中的人物模型，仅保留背景与对话框。</p>
          </div>
          <div className="border-t border-dashed border-[#e6d5b8] pt-4">
            <SettingToggle label="无 Live2D 模式 (隐藏左下角提示)" value={settings.enableNoLive2DMode} onChange={v => setSettings({...settings, enableNoLive2DMode: v})} />
          </div>
          <div className="border-t border-dashed border-[#e6d5b8] pt-4">
            <label className="block text-sm font-bold text-[#ba3f42] mb-2">Live2D 模型渲染精度</label>
            <select value={settings.live2dResolution || 1} onChange={e => { setSettings({...settings, live2dResolution: parseFloat(e.target.value)}); setModelReloadTrigger(prev => prev + 1); }}
              className="w-full bg-[#fdfaf5] border border-[#d9c5b2] text-[#4a4036] font-bold text-xs rounded-md px-3 py-2 outline-none shadow-inner">
              <option value={1}>标准精度 (1x)</option>
              <option value={2}>高清精度 (2x)</option>
              <option value={3}>超清精度 (3x)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 默认 Live2D 模型微调 */}
      <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm flex flex-col gap-6">
        <div>
          <h4 className="text-sm font-bold text-[#ba3f42] mb-3 border-b border-dashed border-[#e6d5b8] pb-2">默认 Live2D 模型微调</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SettingSlider label="模型缩放" value={currentModelConfig.scale} min={0.01} max={2} step={0.01} suffix="x" onChange={v => updateModelConfig('scale', v)} />
            <SettingSlider label="水平位置 (X)" value={currentModelConfig.x} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('x', v)} />
            <SettingSlider label="垂直位置 (Y)" value={currentModelConfig.y} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('y', v)} />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-3 border-b border-dashed border-[#e6d5b8] pb-2">
            <h4 className="text-sm font-bold text-[#ba3f42]">DLC: 故事剧本立绘微调</h4>
            <button onClick={() => handleEnterVisualAdjust('story_model')} className="flex items-center gap-1 px-3 py-1 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={12}/> 预览调整</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SettingSlider label="立绘缩放" value={settings.storySpriteScale || 1.0} min={0.5} max={3.0} step={0.05} suffix="x" onChange={v => setSettings({...settings, storySpriteScale: v})} />
            <SettingSlider label="水平偏移 (X)" value={settings.storySpriteX || 0} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, storySpriteX: v})} />
            <SettingSlider label="立绘垂直 (Y)" value={settings.storySpriteY || 0} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, storySpriteY: v})} />
          </div>
        </div>
      </div>

      {/* 面部捕捉 */}
      <SettingSectionTitle title="面部捕捉 (Face Tracking)" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div className="flex flex-col gap-3">
          <SettingToggle label="开启摄像头实时面部捕捉" value={settings.enableFaceTracking} onChange={v => setSettings({...settings, enableFaceTracking: v})} />
          <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed">基于 Mediapipe 驱动，面部动作将直接映射给当前 Live2D 模型。</p>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#e6d5b8] pt-4">
            <label className="text-sm font-bold text-[#ba3f42]">捕捉精度模式</label>
            <select value={settings.faceTrackingMode} onChange={e => setSettings({...settings, faceTrackingMode: e.target.value})} className="bg-[#fdfaf5] border border-[#d9c5b2] text-[#4a4036] font-bold text-xs rounded-md px-3 py-1.5 outline-none shadow-inner">
              <option value="full">全脸追踪</option>
              <option value="mouthOnly">仅捕捉嘴巴</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-dashed border-[#e6d5b8] pt-6 md:pt-0 md:pl-6">
          <SettingToggle label="显示摄像头画中画预览" value={settings.enableCameraPreview} onChange={v => setSettings({...settings, enableCameraPreview: v})} />
          <div className="mt-3 pt-4 border-t border-dashed border-[#e6d5b8]">
            <button onClick={handleResetFocus} className="w-full px-4 py-2 bg-[#fdfaf5] hover:bg-[#efe6d5] border border-[#d9c5b2] text-[#4a4036] font-bold text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2">
              <RefreshCw size={14} className="text-[#ba3f42]"/> 强制复位视线与头部
            </button>
          </div>
        </div>
      </div>

      {/* 背景图管理 */}
      <SettingSectionTitle title="背景图管理" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
          <label className="block font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 导入游戏内背景图 (支持多张)</label>
          <p className="text-xs text-[#7a6b5d] mb-4">导入后可在游戏界面的【背景】菜单中快速无缝切换。</p>
          <input type="file" accept="image/*" multiple onChange={handleBgUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#8fbf8f] file:text-white hover:file:bg-[#7ebd7e] cursor-pointer mb-4"/>
          {bgList.length > 0 && (
            <div className="max-h-32 overflow-y-auto bg-white rounded-lg p-2 border border-[#e6d5b8] space-y-1">
              {bgList.map(bg => (
                <div key={bg.id} className={`flex justify-between items-center px-3 py-2 rounded text-xs group transition-colors ${settings.currentBgId === bg.id ? 'bg-[#8fbf8f]/20 font-bold text-[#4a4036]' : 'hover:bg-black/5 text-[#7a6b5d]'}`}>
                  <span className="truncate pr-4 flex-1 cursor-pointer" onClick={() => setSettings({...settings, currentBgId: bg.id})}>{settings.currentBgId === bg.id ? '🖼️ ' : ''}{bg.name}</span>
                  <button onClick={() => removeBg(bg.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 px-2 shrink-0"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <label className="block font-bold text-[#ba3f42]"><span className="text-sm">✱</span> 主标题界面背景图</label>
            {localTitleBgImage && <button onClick={() => handleEnterVisualAdjust('title_bg')} className="flex items-center gap-1 px-3 py-1 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-[10px] font-bold rounded-full transition-colors shadow-sm"><Eye size={12}/> 预览调整偏移</button>}
          </div>
          <p className="text-xs text-[#7a6b5d] mb-4">设置启动软件时，主标题画面的专属背景图。</p>
          <input type="file" accept="image/*" onChange={handleTitleBgUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#4fa0d8] file:text-white hover:file:bg-[#5db4f0] cursor-pointer"/>
          {localTitleBgImage && (
            <div className="mt-4 border-t border-dashed border-[#e6d5b8] pt-4 space-y-4">
              <button onClick={clearTitleBgImage} className="w-max px-4 py-1.5 bg-[#f5e6e6] hover:bg-[#eabfbf] text-[#ba3f42] rounded-full text-xs font-bold transition-colors shadow-sm">清除标题背景</button>
            </div>
          )}
        </div>
      </div>

      {/* 主标题定制 */}
      <SettingSectionTitle title="主标题定制 (Title Screen)" extra={<button onClick={() => handleEnterVisualAdjust('title_text')} className="flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={14}/> 预览调整排版</button>} />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
        <div>
          <h4 className="text-sm font-bold text-[#4a4036] mb-3">主标题文案与排版</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#7a6b5d] mb-1 font-bold">文字内容</label>
              <input type="text" value={settings.mainTitleText} onChange={e => setSettings({...settings, mainTitleText: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm focus:border-[#ba3f42] outline-none shadow-inner" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-[#7a6b5d] mb-1 font-bold">字体选择</label>
                <select value={settings.mainTitleFont} onChange={e => setSettings({...settings, mainTitleFont: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-2 py-2 text-sm focus:border-[#ba3f42] outline-none shadow-inner">
                  <option value='"Microsoft YaHei", sans-serif'>默认黑体</option><option value='"SimSun", "Songti SC", serif'>经典宋体</option><option value='"KaiTi", "Kaiti SC", serif'>优雅楷体</option><option value='serif'>标准衬线</option>
                </select>
              </div>
              <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">颜色</label><input type="color" value={settings.mainTitleColor} onChange={e => setSettings({...settings, mainTitleColor: e.target.value})} className="h-9 w-14 rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner block" /></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingSlider label="水平偏移 (X)" value={settings.mainTitleX} min={-800} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, mainTitleX: v})} />
            <SettingSlider label="垂直偏移 (Y)" value={settings.mainTitleY} min={-500} max={500} step={10} suffix="px" onChange={v => setSettings({...settings, mainTitleY: v})} />
          </div>
        </div>
        <div className="pt-6 border-t border-[#e6d5b8]">
          <h4 className="text-sm font-bold text-[#4a4036] mb-3">副标题文案与排版</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#7a6b5d] mb-1 font-bold">文字内容</label>
              <input type="text" value={settings.subTitleText} onChange={e => setSettings({...settings, subTitleText: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm focus:border-[#ba3f42] outline-none shadow-inner" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-[#7a6b5d] mb-1 font-bold">字体选择</label>
                <select value={settings.subTitleFont} onChange={e => setSettings({...settings, subTitleFont: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-2 py-2 text-sm focus:border-[#ba3f42] outline-none shadow-inner">
                  <option value='"Microsoft YaHei", sans-serif'>默认黑体</option><option value='"SimSun", "Songti SC", serif'>经典宋体</option><option value='"KaiTi", "Kaiti SC", serif'>优雅楷体</option><option value='sans-serif'>现代无衬线</option>
                </select>
              </div>
              <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">颜色</label><input type="color" value={settings.subTitleColor} onChange={e => setSettings({...settings, subTitleColor: e.target.value})} className="h-9 w-14 rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner block" /></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingSlider label="水平偏移 (X)" value={settings.subTitleX} min={-800} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, subTitleX: v})} />
            <SettingSlider label="垂直偏移 (Y)" value={settings.subTitleY} min={-500} max={500} step={10} suffix="px" onChange={v => setSettings({...settings, subTitleY: v})} />
          </div>
        </div>
        <div className="pt-6 border-t border-[#e6d5b8]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-[#4a4036]">主标题 Live2D 模型排版</h4>
            <button onClick={() => handleEnterVisualAdjust('title_model')} className="flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={14}/> 预览调整</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="flex flex-col justify-center">
              <SettingToggle label="隐藏主标题界面的 Live2D 模型" value={settings.hideTitleLive2d} onChange={v => setSettings({...settings, hideTitleLive2d: v})} />
              <p className="text-xs text-[#7a6b5d] mt-2">如果您上传的主标题背景图自带人物，可以开启此项隐藏 Live2D 看板娘。</p>
            </div>
            <div className="flex flex-col gap-4">
              <SettingSlider label="独立标题模型缩放" value={currentModelConfig.titleScale} min={0.01} max={2} step={0.01} suffix="x" onChange={v => updateModelConfig('titleScale', v)} />
              <SettingSlider label="独立水平位置 (X)" value={currentModelConfig.titleX} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('titleX', v)} />
              <SettingSlider label="独立垂直位置 (Y)" value={currentModelConfig.titleY} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('titleY', v)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
