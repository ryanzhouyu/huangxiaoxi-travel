/**
 * R02 动画生命周期的可执行契约，纯状态转移，不播放任何角色动画。
 * effects 由未来引擎适配器解释；下面的测试不能替代真实绑定／渲染／真机。
 */
export function initialAnimationState() {
  return {phase: 'empty', request: 0, handle: null, hidden: false, responding: false, blinking: false, motion: 0, error: null};
}
export function transition(current, event) {
  const state = {...current}, effects = [];
  const result = () => ({state, effects});
  if (state.phase === 'disposed') {
    if (event.type === 'loaded') effects.push({type: 'dispose-handle', handle: event.handle});
    return result();
  }
  switch (event.type) {
    case 'load':
      state.request++;
      state.phase = 'loading';
      state.responding = state.blinking = false;
      state.motion++;
      state.error = null;
      if (state.handle) effects.push({type: 'pause', handle: state.handle});
      effects.push({type: 'load', request: state.request, look: event.look});
      break;
    case 'loaded':
      if (event.request !== state.request || state.phase !== 'loading') {
        if (event.handle !== state.handle) effects.push({type: 'dispose-handle', handle: event.handle});
        break;
      }
      effects.push({type: 'activate', handle: event.handle});
      if (state.handle && state.handle !== event.handle) effects.push({type: 'dispose-handle', handle: state.handle});
      state.handle = event.handle;
      state.phase = state.hidden ? 'hidden' : 'idle';
      effects.push({type: state.hidden ? 'pause' : 'idle', handle: state.handle});
      break;
    case 'failed':
      if (event.request !== state.request || state.phase !== 'loading') break;
      state.phase = 'error';
      state.error = event.code || 'RESOURCE_FAILED';
      // 旧搭配保留为故障反馈；错误被明确展示，不能把它当新搭配成功。
      break;
    case 'tap':
      if (state.phase !== 'idle' || !state.handle || state.hidden) break;
      state.responding = true;
      state.blinking = false;
      state.phase = 'responding';
      state.motion++;
      effects.push({type: 'tapResponse', handle: state.handle, motion: state.motion});
      break;
    case 'response-ended':
      if (state.phase !== 'responding' || event.motion !== state.motion) break;
      state.responding = false;
      state.phase = 'idle';
      effects.push({type: 'idle', handle: state.handle});
      break;
    case 'blink':
      if (state.phase !== 'idle' || state.blinking || event.expression === 'joy') break;
      state.blinking = true;
      state.motion++;
      effects.push({type: 'blink', handle: state.handle, motion: state.motion});
      break;
    case 'blink-ended':
      if (event.motion === state.motion) state.blinking = false;
      break;
    case 'hide':
      state.hidden = true;
      state.motion++;
      state.responding = state.blinking = false;
      if (state.handle) effects.push({type: 'pause', handle: state.handle});
      if (!['loading', 'error', 'empty'].includes(state.phase)) state.phase = 'hidden';
      break;
    case 'show':
      state.hidden = false;
      if (state.phase === 'hidden') {
        state.phase = 'idle';
        effects.push({type: 'idle', handle: state.handle});
      }
      break;
    case 'dispose':
      state.request++;
      state.motion++;
      if (state.handle) effects.push({type: 'dispose-handle', handle: state.handle});
      state.handle = null;
      state.phase = 'disposed';
      state.responding = state.blinking = false;
      effects.push({type: 'cancel-loads'});
      break;
    default: throw new Error('Unknown animation event: ' + event.type);
  }
  return result();
}
