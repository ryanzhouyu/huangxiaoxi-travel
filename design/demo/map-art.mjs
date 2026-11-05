// 四个示意点锚定在地图原画上。单位为原图宽、高的百分比。
export const mapPins = {
  gate: [54, 62],
  ridge: [64, 34],
  brook: [31, 51],
  shop: [78, 48],
};

// 地点详情使用独立构图。viewBox 以 941 × 1672 的本地原画为坐标系。
const banners = {
  gate: ['night', '175 147 655 595'],
  shop: ['night', '0 580 537 350'],
  ridge: ['map', '110 15 790 458'],
  brook: ['map', '100 689 660 440'],
};
export function photoWindow(pointId, sceneName) {
  const banner = banners[pointId];
  return banner?.[0] === sceneName ? banner[1].split(' ').map(Number) : null;
}

export function locationBanner(pointId, picture) {
  const [name, frame] = banners[pointId];
  return (
    '<svg class="world-art location-view" aria-hidden="true" viewBox="' +
    frame +
    '" preserveAspectRatio="xMidYMid slice"><image href="' +
    picture(name) +
    '" width="941" height="1672"/></svg>'
  );
}

export function mapPlane(background, pins) {
  return '<div class="map-plane">' + background + pins + '</div>';
}
