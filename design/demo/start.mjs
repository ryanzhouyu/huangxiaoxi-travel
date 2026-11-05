try {
  await import('../app.mjs');
} catch (error) {
  const app = document.querySelector('#app');
  app.replaceChildren();
  const message = document.createElement('p');
  message.className = 'loading-note';
  message.textContent = '暂时无法载入手账，请检查本地预览服务。';
  const retry = document.createElement('button');
  retry.className = 'btn';
  retry.textContent = '重新打开';
  retry.onclick = () => location.reload();
  app.append(message, retry);
  console.error(error);
}
