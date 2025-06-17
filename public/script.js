// 全域變數
let map;
let centerMarker;
let restaurantList = [];
let wheelAngle = 0;

// 初始化地圖
function initMap() {
  const initialLocation = { lat: 25.013345, lng: 121.467142 };

  map = new google.maps.Map(document.getElementById('map'), {
    center: initialLocation,
    zoom: 15,
  });

  centerMarker = new google.maps.Marker({
    position: initialLocation,
    map: map,
    draggable: false,
    title: '地圖中心',
  });

  map.addListener('center_changed', () => {
    const center = map.getCenter();
    centerMarker.setPosition(center);
  });
}

// 抓取附近餐廳
function fetchNearbyRestaurants() {
  if (!map) return alert('地圖尚未載入完成');

  const center = map.getCenter();
  const lat = center.lat();
  const lng = center.lng();
  const radius = document.getElementById('radiusInput')?.value || 1000;

  if (!lat || !lng || !radius) return alert('缺少 lat、lng 或 radius');

  const url = `/api/restaurants?lat=${lat}&lng=${lng}&radius=${radius}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.error) return alert(data.error);
      if (!Array.isArray(data) || data.length === 0) return alert('找不到附近的餐廳');

      restaurantList = data.map(name => ({ name }));
      drawWheel();
    })
    .catch(err => {
      console.error('取得餐廳錯誤:', err);
      alert('取得餐廳失敗');
    });
}

// 畫轉盤
function drawWheel() {
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  const numSegments = restaurantList.length;
  const angleStep = (2 * Math.PI) / numSegments;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((wheelAngle * Math.PI) / 180);

  restaurantList.forEach((restaurant, index) => {
    const angle = index * angleStep;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 200, angle, angle + angleStep);
    ctx.fillStyle = index % 2 === 0 ? '#FFB6C1' : '#87CEFA';
    ctx.fill();

    ctx.save();
    ctx.rotate(angle + angleStep / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000';
    ctx.font = '8px Arial';
    ctx.fillText(restaurant.name || '無名稱', 190, 5);
    ctx.restore();
  });

  ctx.restore();
}

// 開始旋轉轉盤，並讓選中項目指向最上方
function startSpin() {
  if (restaurantList.length === 0) {
    alert('請先取得附近餐廳！');
    return;
  }

  const segmentAngle = 360 / restaurantList.length;
  const randomIndex = Math.floor(Math.random() * restaurantList.length);

  // 讓目標轉盤角度對齊正上方（270度 = Math.PI * 3/2）
  const selectedAngle = 270 - (randomIndex * segmentAngle) - (segmentAngle / 2);
  const targetRotation = 360 * 5 + selectedAngle; // 往前多轉 5 圈

  const duration = 3000;
  const frameRate = 1000 / 60;
  const totalFrames = duration / frameRate;
  let current = 0;
  const startAngle = 0; // 每次從 0 開始
  const delta = targetRotation;

  const spin = () => {
    current++;
    const progress = current / totalFrames;
    const easeOut = 1 - Math.pow(1 - progress, 3); // ease out cubic
    wheelAngle = startAngle + delta * easeOut;
    drawWheel();

    if (current < totalFrames) {
      requestAnimationFrame(spin);
    } else {
      // 修正 wheelAngle 最終落點，使未來繪圖一致
      wheelAngle = targetRotation % 360;
      const finalIndex = randomIndex;
      alert(`🎯 選中的是：${restaurantList[finalIndex].name}`);
    }
  };

  spin();
}

// 登入
function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) return alert(data.error);
      alert(data.message);
      toggleSections(true);
    });
}

// 註冊
function register() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) return alert(data.error);
      alert(data.message);
      toggleSections(true);
    });
}

function logout() {
  toggleSections(false);
}

function toggleSections(loggedIn) {
  document.getElementById('loginSection').style.display = loggedIn ? 'none' : 'block';
  document.getElementById('wheelSection').style.display = loggedIn ? 'flex' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  toggleSections(false);
  document.getElementById('fetchBtn').addEventListener('click', fetchNearbyRestaurants);
});
