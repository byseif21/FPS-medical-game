function saveScore(results) {
    if (typeof require === 'function' && require('electron')) {
      const fs = require('fs');
      const filePath = 'game_results.json';
      let existingData = [];
      try {
        if (fs.existsSync(filePath)) {
          existingData = JSON.parse(fs.readFileSync(filePath));
        }
        existingData.push(results);
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
      } catch (error) {
        console.error('Error saving to file:', error);
      }
    } else {
      let existingData = JSON.parse(localStorage.getItem('gameResults') || '[]');
      existingData.push(results);
      localStorage.setItem('gameResults', JSON.stringify(existingData));
    }
  }
  
  function saveScoreToFile() {
    const doctorNameTrimmed = doctorName.trim();
    if (doctorNameTrimmed && doctorNameTrimmed.toLowerCase() !== "unknown doctor") {
      const results = {
        doctorName: doctorNameTrimmed,
        phase1Score: phase1Score,
        phase2Score: phase2Score,
        totalScore: score,
        date: new Date().toISOString()
      };
      saveScore(results);
      console.log('Results saved:', results);
    } else {
      console.log('Score not saved: Invalid doctor name ("' + doctorNameTrimmed + '")');
    }
  }
  
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  
  const phaseHud = document.getElementById('phaseHud');
  const hud = document.getElementById('hud');
  const scoreElement = document.getElementById('score');
  const targetsLeftElement = document.getElementById('targetsLeft');
  const weaponImage = document.getElementById('weaponImage');
  const gameOverPopup = document.getElementById('gameOverPopup');
  const finalScoreElement = document.getElementById('finalScore');
  const phase1ScoreElement = document.getElementById('phase1Score');
  const phase2ScoreElement = document.getElementById('phase2Score');
  const doctorNameDisplay = document.getElementById('doctorNameDisplay');
  const restartButton = document.getElementById('restartButton');
  const newNameButton = document.getElementById('newNameButton');
  const viewResultsButton = document.getElementById('viewResultsButton');
  const viewTopScoresButton = document.getElementById('viewTopScoresButton');
  const instructionsPopup = document.getElementById('instructionsPopup');
  const startButton = document.getElementById('startButton');
  const viewTopScoresStartButton = document.getElementById('viewTopScoresStartButton');
  const nameInput = document.getElementById('nameInput');
  const crosshair = document.getElementById('crosshair');
  const topScoresModal = document.getElementById('topScoresModal');
  const topScoresList = document.getElementById('topScoresList');
  const closeTopScoresButton = document.getElementById('closeTopScoresButton');
  const savedResultsModal = document.getElementById('savedResultsModal');
  const savedResultsList = document.getElementById('savedResultsList');
  const closeSavedResultsButton = document.getElementById('closeSavedResultsButton');
  const muteButton = document.getElementById('muteButton');
  const restartGameButton = document.getElementById('restartGameButton');
  const phaseIntro = document.getElementById('phaseIntro');
  const timerElement = document.getElementById('timer');
  const logo = document.getElementById('logo');
  
  const backgroundMusic = document.getElementById('backgroundMusic');
  
  let score = 0;
  let phase1Score = 0;
  let phase2Score = 0;
  let wave = 1;
  let targets = [];
  let isGameRunning = false;
  let isSniper = false;
  let weapons = null;
  let sponsorBillboard = null;
  let lastShotTime = 0;
  let reloadTime = 200;
  let phaseTimer = null;
  let timeLeft = 30; // 30 seconds per phase
  const baseTargetCount = 5;
  const MIN_DISTANCE = 10;
  const MOUSE_SENSITIVITY = 0.002;
  const MAX_ROTATION_X = Math.PI / 3;
  const MIN_ROTATION_X = -Math.PI / 3;
  const MAX_ROTATION_Y = Math.PI / 3;
  const MIN_ROTATION_Y = -Math.PI / 3;
  let doctorName = '';
  let isMuted = false;
  let wasGameOverVisible = false;
  let wasInstructionsVisible = false;
  
  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();
  
  const TARGET_FPS = 60;
  const FRAME_TIME = 1000 / TARGET_FPS;
  let lastFrameTime = 0;
  
  const shotgunSounds = [
    document.getElementById('shotgunSound'),
    new Audio('assets/sounds/shotgun.mp3'),
    new Audio('assets/sounds/shotgun.mp3')
  ];
  const sniperSounds = [
    document.getElementById('sniperSound'),
    new Audio('assets/sounds/sniper.mp3'),
    new Audio('assets/sounds/sniper.mp3')
  ];
  sniperSounds.forEach(sound => sound.volume = 0.3);
  const clickSounds = [
    document.getElementById('clickSound'),
    new Audio('assets/sounds/arcade.mp3'),
    new Audio('assets/sounds/arcade.mp3')
  ];
  const mistakeSounds = [
    document.getElementById('mistakeSound'),
    new Audio('assets/sounds/mistake.wav'),
    new Audio('assets/sounds/mistake.wav')
  ];
  let shotgunSoundIndex = 0;
  let sniperSoundIndex = 0;
  let clickSoundIndex = 0;
  let mistakeSoundIndex = 0;
  
  function toggleMute() {
    isMuted = !isMuted;
    muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
    muteButton.classList.toggle('muted', !isMuted);
    if (isMuted) {
      backgroundMusic.pause();
    } else {
      if (isGameRunning) backgroundMusic.play();
    }
  }
  
  function playShotgunSound() {
    const sound = shotgunSounds[shotgunSoundIndex];
    sound.currentTime = 0;
    sound.play();
    shotgunSoundIndex = (shotgunSoundIndex + 1) % shotgunSounds.length;
  }
  
  function playSniperSound() {
    const sound = sniperSounds[sniperSoundIndex];
    sound.currentTime = 0;
    sound.play();
    sniperSoundIndex = (sniperSoundIndex + 1) % sniperSounds.length;
  }
  
  function playClickSound() {
    const sound = clickSounds[clickSoundIndex];
    sound.currentTime = 0;
    sound.play();
    clickSoundIndex = (clickSoundIndex + 1) % clickSounds.length;
  }
  
  function playMistakeSound() {
    const sound = mistakeSounds[mistakeSoundIndex];
    sound.currentTime = 0;
    sound.play();
    mistakeSoundIndex = (mistakeSoundIndex + 1) % mistakeSounds.length;
  }
  
  function updateScoreDisplay() {
    scoreElement.textContent = score;
    scoreElement.style.color = score < 0 ? 'red' : 'white';
    scoreElement.style.transition = 'color 0.3s ease';
  }
  
  function startPhaseTimer() {
    timeLeft = 30;
    timerElement.textContent = `Time: ${timeLeft}s`;
    timerElement.style.display = 'block';
    if (phaseTimer) clearInterval(phaseTimer);
    phaseTimer = setInterval(() => {
      timeLeft--;
      timerElement.textContent = `Time: ${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(phaseTimer);
        if (wave === 1) {
          transitionToPhase2();
        } else {
          endGame();
        }
      }
    }, 1000);
  }
  
  function createShootingRange() {
    const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyboxMaterial = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vWorldPosition; void main() { vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vWorldPosition; void main() { vec3 color = mix(vec3(0.68, 0.90, 0.97), vec3(0.15, 0.35, 0.55), vWorldPosition.y / 500.0); gl_FragColor = vec4(color, 1.0); }`,
      side: THREE.BackSide
    });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);
  
    const terrainSize = 500;
    const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 32, 32);
    const textureLoader = new THREE.TextureLoader();
    const texturePath = 'assets/models/ground/textures/';
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.FrontSide
    });
  
    textureLoader.load(texturePath + 'rocky_terrain_02_diff_4k.jpg', (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      terrainMaterial.map = texture;
      terrainMaterial.needsUpdate = true;
    }, undefined, (err) => console.error('Error loading diffuse texture:', err));
  
    /*textureLoader.load(texturePath + 'rocky_terrain_02_rough_4k.exr', (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      terrainMaterial.roughnessMap = texture;
      terrainMaterial.needsUpdate = true;
    }, undefined, (err) => console.error('Error loading roughness texture:', err));*/
  
    textureLoader.load(texturePath + 'rocky_terrain_02_disp_4k.png', (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      const vertices = terrainGeometry.attributes.position.array;
      const img = texture.image;
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const terrainSegments = 32;
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < terrainGeometry.attributes.position.count; i++) {
          const idx = i * 3;
          const u = (i % (terrainSegments + 1)) / terrainSegments;
          const v = Math.floor(i / (terrainSegments + 1)) / terrainSegments;
          const pixelX = Math.floor(u * canvas.width);
          const pixelY = Math.floor(v * canvas.height);
          const pixelIdx = (pixelY * canvas.width + pixelX) * 4;
          const height = imgData[pixelIdx] / 255.0 * 3.0;
          vertices[idx + 2] = height;
        }
        terrainGeometry.attributes.position.needsUpdate = true;
        terrainGeometry.computeVertexNormals();
      } catch (e) {
        console.error('Error applying displacement:', e);
      }
    });
  
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -5;
    terrain.receiveShadow = true;
    scene.add(terrain);
  
    const mountainGeometry = new THREE.SphereGeometry(100, 32, 32);
    const mountainVertices = mountainGeometry.attributes.position.array;
    for (let i = 0; i < mountainVertices.length; i += 3) {
      const x = mountainVertices[i];
      const y = mountainVertices[i + 1];
      const z = mountainVertices[i + 2];
      const distance = Math.sqrt(x * x + y * y + z * z);
      const noise = (Math.sin(x * 0.1) + Math.cos(z * 0.1)) * 10 + Math.random() * 5;
      const scale = 1 + noise / 100;
      mountainVertices[i] = x * scale;
      mountainVertices[i + 1] = y * scale * 0.5;
      mountainVertices[i + 2] = z * scale;
    }
    mountainGeometry.computeVertexNormals();
    const mountainMaterial = new THREE.MeshPhongMaterial({ color: 0xAB7A4B, shininess: 12, flatShading: false });
    for (let i = 0; i < 3; i++) {
      const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
      mountain.position.set(-50 + i * 50, -5, -300);
      mountain.scale.set(1 + Math.random() * 0.5, 0.5 + Math.random() * 0.3, 1 + Math.random() * 0.5);
      mountain.rotation.y = Math.random() * Math.PI;
      mountain.receiveShadow = true;
      scene.add(mountain);
      const ray = new THREE.Raycaster(new THREE.Vector3(mountain.position.x, 100, mountain.position.z), new THREE.Vector3(0, -1, 0));
      const intersects = ray.intersectObject(terrain);
      if (intersects.length > 0) mountain.position.y = intersects[0].point.y;
    }
  
    const targetBoardGeometry = new THREE.PlaneGeometry(6, 12);
    const targetBoardMaterial = new THREE.MeshPhongMaterial({ color: 0x0000FF });
    const targetPositions = [-20, 0, 20];
    for (let i = 0; i < targetPositions.length; i++) {
      const targetBoard = new THREE.Mesh(targetBoardGeometry, targetBoardMaterial);
      targetBoard.position.set(targetPositions[i], 3, -140);
      targetBoard.castShadow = true;
      scene.add(targetBoard);
      const targetCircleGeometry = new THREE.CircleGeometry(2, 32);
      const targetCircleMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000, transparent: true, opacity: 0.8 });
      const targetCircle = new THREE.Mesh(targetCircleGeometry, targetCircleMaterial);
      targetCircle.position.copy(targetBoard.position);
      targetCircle.position.z += 0.1;
      scene.add(targetCircle);
      for (let j = 1; j <= 2; j++) {
        const ringGeometry = new THREE.RingGeometry(j * 0.8, j * 0.8 + 0.2, 32);
        const ringMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(targetBoard.position);
        ring.position.z += 0.2;
        scene.add(ring);
      }
    }
  
    const sponsorGeometry = new THREE.PlaneGeometry(120, 15);
    const sponsorTexture = textureLoader.load('assets/ui/Brands.png');
    const sponsorMaterial = new THREE.MeshPhongMaterial({
      map: sponsorTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    sponsorBillboard = new THREE.Mesh(sponsorGeometry, sponsorMaterial);
    sponsorBillboard.position.set(0, 3, -20);
    sponsorBillboard.rotation.x = -Math.PI / 8;
    sponsorBillboard.castShadow = true;
    sponsorBillboard.receiveShadow = true;
    scene.add(sponsorBillboard);
  
    const rockCount = 15;
    for (let i = 0; i < rockCount; i++) {
      const rockGeometry = new THREE.SphereGeometry(1.5 + Math.random() * 1, 8, 8);
      const rockMaterial = new THREE.MeshPhongMaterial({ color: 0xA0A0A0 });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      const x = -terrainSize / 2 + Math.random() * terrainSize;
      const z = -terrainSize / 2 + Math.random() * terrainSize;
      rock.position.set(x, 100, z);
      rock.scale.set(1 + Math.random(), 0.5 + Math.random() * 0.5, 1 + Math.random());
      rock.castShadow = true;
      const ray = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
      const intersects = ray.intersectObject(terrain);
      if (intersects.length > 0) rock.position.y = intersects[0].point.y + 0.5;
      else rock.position.y = -5 + 0.5;
      scene.add(rock);
    }
  
    const ambientLight = new THREE.AmbientLight(0x606060, 1.5);
    scene.add(ambientLight);
    const sunlight = new THREE.DirectionalLight(0xFFFFFF, 2.5);
    sunlight.position.set(50, 100, 50);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.width = 1024;
    sunlight.shadow.mapSize.height = 1024;
    sunlight.shadow.camera.near = 0.5;
    sunlight.shadow.camera.far = 500;
    sunlight.shadow.camera.left = -terrainSize / 2;
    sunlight.shadow.camera.right = terrainSize / 2;
    sunlight.shadow.camera.top = terrainSize / 2;
    sunlight.shadow.camera.bottom = -terrainSize / 2;
    scene.add(sunlight);
  }
  
  function createTargets(callback) {
    targets.forEach(target => scene.remove(target.mesh));
    targets = [];
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath('assets/models/targets/BLEND/');
    mtlLoader.load('targhet.mtl', (materials) => {
      materials.preload();
      const textureLoader = new THREE.TextureLoader();
  
      textureLoader.load('assets/models/targets/BLEND/Targetshoot2.png', (diseasedTexture) => {
        diseasedTexture.flipY = true;
        diseasedTexture.repeat.set(1.9, 1.2);
        diseasedTexture.offset.set(0.17, 1.1);
        diseasedTexture.wrapS = diseasedTexture.wrapT = THREE.RepeatWrapping;
        diseasedTexture.encoding = THREE.sRGBEncoding;
  
        textureLoader.load('assets/models/targets/BLEND/Targetdont2.png', (healthyTexture) => {
          healthyTexture.flipY = true;
          healthyTexture.repeat.set(1.9, 1.2);
          healthyTexture.offset.set(0.17, 1.1);
          healthyTexture.wrapS = healthyTexture.wrapT = THREE.RepeatWrapping;
          healthyTexture.encoding = THREE.sRGBEncoding;
  
          const objLoader = new THREE.OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.setPath('assets/models/targets/BLEND/');
          objLoader.load('targhet.obj', (object) => {
            object.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            const diseasedCount = wave === 1 ? baseTargetCount : 8;
            const healthyCount = 6;
  
            for (let i = 0; i < diseasedCount; i++) {
              createTarget(object, i, false, diseasedTexture);
            }
            for (let i = 0; i < healthyCount; i++) {
              createTarget(object, i + diseasedCount, true, healthyTexture);
            }
            targetsLeftElement.textContent = targets.filter(t => !t.isGoodTarget && !t.hit).length;
            renderer.render(scene, camera);
            if (callback) callback();
          }, undefined, (err) => console.error('Error loading target model:', err));
        }, undefined, (err) => console.error('Error loading healthy texture:', err));
      }, undefined, (err) => console.error('Error loading diseased texture:', err));
    }, undefined, (err) => console.error('Error loading target material:', err));
  }
  
  function createTarget(originalObject, index, isGoodTarget, texture) {
    const targetMesh = originalObject.clone();
    let zPos;
    let scale;
    let xPos;
    let speedMultiplier = 1;
  
    if (isGoodTarget) {
      zPos = -80 + Math.random() * 40;
      scale = 1.7;
      xPos = -60 + Math.random() * 120;
    } else {
      const rowDepths = wave === 1
        ? [-40, -60, -80, -90, -100]
        : [-45, -50, -65, -70, -85, -95];
      const rowSizes = wave === 1
        ? [1.7, 1.7, 1.7, 1.7, 1.4]
        : [1.7, 1.7, 1.7, 1.7, 1.4, 1.3];
  
      const rowIndex = index % rowDepths.length;
      zPos = rowDepths[rowIndex] + (Math.random() - 0.5) * 5;
      scale = rowSizes[rowIndex];
  
      if (wave === 1 && rowIndex >= 3) {
        speedMultiplier = 1.5;
      } else if (wave === 2 && rowIndex >= 3) {
        speedMultiplier = 1.5;
      }
  
      if (wave === 2 && index === 0) {
        zPos = -40;
        xPos = -70;
        scale = 1.7;
      } else {
        xPos = -60 + Math.random() * 120;
      }
    }
  
    targetMesh.position.set(xPos, 2, zPos);
    targetMesh.scale.set(scale, scale, scale);
    targetMesh.rotation.set(-Math.PI / 2, 0, 0);
  
    targetMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhongMaterial({
          map: texture,
          specular: 0x333333,
          shininess: 30,
          emissiveIntensity: 0.5,
          roughness: 0.5,
          transparent: true,
          opacity: 1.0,
          side: THREE.DoubleSide
        });
        if (!isGoodTarget) {
          child.material.depthTest = true;
          child.material.opacity = 0.95;
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(targetMesh);
  
    targets.push({
      mesh: targetMesh,
      hit: false,
      isGoodTarget: isGoodTarget,
      basePosition: targetMesh.position.clone(),
      phase: Math.random() * Math.PI * 2,
      speed: (wave === 1 ? (0.3 + Math.random() * 0.3) : (0.2 + Math.random() * 0.2)) * speedMultiplier,
      moveRangeX: 20 + Math.random() * 20
    });
  }
  
  function createWeapons(callback) {
    const textureLoader = new THREE.TextureLoader();
  
    const shotgunMtlLoader = new THREE.MTLLoader();
    shotgunMtlLoader.setPath('assets/models/shotgun/');
    const shotgunDiffuseMap = textureLoader.load('assets/models/shotgun/Sg_Diffuse.png');
    const shotgunNormalMap = textureLoader.load('assets/models/shotgun/Sg_normals.png');
    const shotgunSpecularMap = textureLoader.load('assets/models/shotgun/Sg_Spec.png');
  
    shotgunMtlLoader.load('Shotgun.mtl', (shotgunMaterials) => {
      shotgunMaterials.preload();
      const shotgunObjLoader = new THREE.OBJLoader();
      shotgunObjLoader.setMaterials(shotgunMaterials);
      shotgunObjLoader.setPath('assets/models/shotgun/');
      shotgunObjLoader.load('Shotgun.obj', (shotgunObject) => {
        shotgunObject.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshPhongMaterial({
              map: shotgunDiffuseMap,
              normalMap: shotgunNormalMap,
              specularMap: shotgunSpecularMap,
              shininess: 100,
              specular: 0xAAAAAA
            });
            child.castShadow = true;
          }
        });
  
        const sniperMtlLoader = new THREE.MTLLoader();
        sniperMtlLoader.setPath('assets/models/sniper/textures/');
        sniperMtlLoader.load('material.lib', (sniperMaterials) => {
          sniperMaterials.preload();
          const sniperObjLoader = new THREE.OBJLoader();
          sniperObjLoader.setMaterials(sniperMaterials);
          sniperObjLoader.setPath('assets/models/sniper/textures/');
          sniperObjLoader.load('sniper3.obj', (sniperObject) => {
            sniperObject.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  map: textureLoader.load('assets/models/sniper/textures/sniper3Color.png'),
                  normalMap: textureLoader.load('assets/models/sniper/textures/sniper3Normal.png'),
                  metalnessMap: textureLoader.load('assets/models/sniper/textures/sniper3Metallic.png'),
                  roughnessMap: textureLoader.load('assets/models/sniper/textures/sniper3Roughness.png'),
                  metalness: 0.7,
                  roughness: 0.2
                });
                child.castShadow = true;
              }
            });
  
            const handMtlLoader = new THREE.MTLLoader();
            handMtlLoader.setPath('assets/models/hand2/');
            handMtlLoader.load('Rigged Hand.mtl', (handMaterials) => {
              handMaterials.preload();
              const handDiffuseMap = textureLoader.load('assets/models/hand2/textures/HAND_C.jpg');
              const handNormalMap = textureLoader.load('assets/models/hand2/textures/HAND_N.jpg');
              const handSpecularMap = textureLoader.load('assets/models/hand2/textures/HAND_S.jpg');
  
              const handObjLoader = new THREE.OBJLoader();
              handObjLoader.setMaterials(handMaterials);
              handObjLoader.setPath('assets/models/hand2/');
              handObjLoader.load('Rigged Hand.obj', (handObject) => {
                handObject.traverse((child) => {
                  if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                      map: handDiffuseMap,
                      normalMap: handNormalMap,
                      specularMap: handSpecularMap,
                      color: 0xFFFFFF,
                      specular: 0x555555,
                      shininess: 50,
                      emissive: 0x101010,
                      emissiveIntensity: 0.3
                    });
                    const leftLight = new THREE.PointLight(0xFFFFFF, 0.8, 10);
                    leftLight.position.set(-2, 0, 0);
                    child.add(leftLight);
                    child.castShadow = true;
                  }
                });
  
                const scatteredWeapon = new THREE.Group();
                const precisionWeapon = new THREE.Group();
  
                const scatteredModel = shotgunObject.clone();
                scatteredModel.scale.set(0.14, 0.14, 0.14);
                scatteredModel.position.set(0.5, -0.6, -1.2);
                scatteredModel.rotation.set(-0.05, -Math.PI / 2, 0);
                scatteredWeapon.add(scatteredModel);
  
                const scatteredHand = handObject.clone();
                scatteredHand.scale.set(36.28, 36.28, 36.28);
                scatteredHand.position.set(-22.62, -37.15, 28.00);
                scatteredHand.rotation.set(-0.99, -3.37, 1.07);
                scatteredWeapon.add(scatteredHand);
  
                const scatteredHand2 = handObject.clone();
                scatteredHand2.scale.set(4.93, 4.93, 4.93);
                scatteredHand2.position.set(-4.339, 1.00, 4.60);
                scatteredHand2.rotation.set(-9.31, 8.45, -5.48);
                scatteredWeapon.add(scatteredHand2);
  
                const precisionModel = sniperObject;
                precisionModel.scale.set(0.03, 0.03, 0.03);
                precisionModel.position.set(0.5, -0.5, -1.2);
                precisionModel.rotation.set(0, Math.PI, 0);
                precisionWeapon.add(precisionModel);
  
                const precisionHand = handObject.clone();
                precisionHand.scale.set(22.32, 22.32, 22.32);
                precisionHand.position.set(1.70, 4.50, 26.75);
                precisionHand.rotation.set(1.61, 5.43, 10.27);
                precisionWeapon.add(precisionHand);
  
                const precisionHand2 = handObject.clone();
                precisionHand2.scale.set(4.18, 4.18, 4.18);
                precisionHand2.position.set(5.70, 1.60, 2.70);
                precisionHand2.rotation.set(-10.51, -5.75, 7.72);
                precisionWeapon.add(precisionHand2);
  
                precisionWeapon.visible = false;
                camera.add(scatteredWeapon);
                camera.add(precisionWeapon);
  
                callback({ scatteredWeapon, precisionWeapon });
                renderer.render(scene, camera);
              }, undefined, (err) => console.error('Error loading hand model:', err));
            }, undefined, (err) => console.error('Error loading hand material:', err));
          }, undefined, (err) => console.error('Error loading sniper model:', err));
        }, undefined, (err) => console.error('Error loading sniper material:', err));
      }, undefined, (err) => console.error('Error loading shotgun model:', err));
    }, undefined, (err) => console.error('Error loading shotgun material:', err));
  }
  
  function setupControls() {
    camera.rotation.order = 'YXZ';
    document.addEventListener('mousemove', (event) => {
      if (!isGameRunning) return;
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;
      let newYaw = camera.rotation.y - movementX * MOUSE_SENSITIVITY;
      newYaw = THREE.MathUtils.clamp(newYaw, MIN_ROTATION_Y, MAX_ROTATION_Y);
      camera.rotation.y = newYaw;
      let newPitch = camera.rotation.x - movementY * MOUSE_SENSITIVITY;
      newPitch = THREE.MathUtils.clamp(newPitch, MIN_ROTATION_X, MAX_ROTATION_X);
      camera.rotation.x = newPitch;
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
  
    renderer.domElement.addEventListener('click', () => {
      if (!isGameRunning || !weapons) return;
      renderer.domElement.requestPointerLock();
      const currentTime = Date.now();
      if (currentTime - lastShotTime < reloadTime) return;
      lastShotTime = currentTime;
      if (isSniper) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        raycaster.far = 200;
        const intersects = raycaster.intersectObjects(targets.filter(t => !t.hit).map(t => t.mesh), true);
        playSniperSound();
        if (intersects.length > 0) {
          const hitTarget = targets.find(t => t.mesh === intersects[0].object || t.mesh.children.includes(intersects[0].object));
          handleHit(hitTarget);
          createLaserEffect();
        }
      } else {
        const spreadAngle = Math.PI / 10;
        const pellets = 6;
        const hitTargets = new Set();
        for (let i = 0; i < pellets; i++) {
          const spreadX = (Math.random() - 0.5) * spreadAngle;
          const spreadY = (Math.random() - 0.5) * spreadAngle;
          const direction = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(camera.rotation.x + spreadY, camera.rotation.y + spreadX, 0));
          const pelletRaycaster = new THREE.Raycaster(camera.position, direction.normalize());
          pelletRaycaster.far = 200;
          const intersects = pelletRaycaster.intersectObjects(targets.filter(t => !t.hit).map(t => t.mesh), true);
          if (intersects.length > 0) {
            const hitTarget = targets.find(t => t.mesh === intersects[0].object || t.mesh.children.includes(intersects[0].object));
            if (hitTarget) hitTargets.add(hitTarget);
          }
          createPelletTrail(direction);
        }
        hitTargets.forEach(target => handleHit(target));
        playShotgunSound();
      }
      createShotFeedback();
      addRecoilEffect();
    });
  
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.exitPointerLock();
        renderer.domElement.style.cursor = 'auto';
      }
    });
  }
  
  function createLaserEffect() {
    const laserGeometry = new THREE.CylinderGeometry(0.05, 0.05, 200, 8);
    const laserMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
    const laser = new THREE.Mesh(laserGeometry, laserMaterial);
    laser.position.set(0, 0, -100);
    laser.rotation.x = Math.PI / 2;
    camera.add(laser);
    let opacity = 0.8;
    const fadeInterval = setInterval(() => {
      opacity -= 0.1;
      laserMaterial.opacity = opacity;
      if (opacity <= 0) {
        camera.remove(laser);
        clearInterval(fadeInterval);
      }
    }, 30);
  }
  
  function createPelletTrail(direction) {
    const pelletGroup = new THREE.Group();
    const pelletCount = 12;
    const spreadFactor = 0.3;
  
    for (let i = 0; i < pelletCount; i++) {
      const pelletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const pelletMaterial = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.7
      });
      const pellet = new THREE.Mesh(pelletGeometry, pelletMaterial);
  
      const spreadX = (Math.random() - 0.5) * spreadFactor;
      const spreadY = (Math.random() - 0.5) * spreadFactor;
      const startPos = new THREE.Vector3(spreadX, spreadY, -2);
      pellet.position.copy(startPos);
  
      const pelletDirection = direction.clone().add(new THREE.Vector3(spreadX, spreadY, 0).multiplyScalar(0.1));
      pellet.lookAt(pelletDirection.clone().multiplyScalar(20).add(startPos));
  
      pelletGroup.add(pellet);
    }
  
    camera.add(pelletGroup);
  
    let opacity = 0.7;
    let distance = 0;
    const speed = 2.0;
    const maxDistance = 200;
    const fadeInterval = setInterval(() => {
      opacity -= 0.05;
      distance += speed;
      pelletGroup.children.forEach(pellet => {
        pellet.material.opacity = opacity;
        pellet.position.z -= speed;
      });
      if (opacity <= 0 || distance >= maxDistance) {
        camera.remove(pelletGroup);
        clearInterval(fadeInterval);
      }
    }, 25);
  }
  
  function createShotFeedback() {
    const shotEffect = document.createElement('div');
    shotEffect.className = 'hitmarker';
    shotEffect.textContent = isSniper ? 'X' : '+';
    shotEffect.style.color = isSniper ? 'red' : 'yellow';
    document.body.appendChild(shotEffect);
    setTimeout(() => {
      shotEffect.style.opacity = '0';
      setTimeout(() => document.body.removeChild(shotEffect), 300);
    }, 100);
  }
  
  function addRecoilEffect() {
    if (!weapons) return;
    const currentWeapon = isSniper ? weapons.precisionWeapon : weapons.scatteredWeapon;
    const originalPosition = currentWeapon.position.clone();
    const recoilAmount = isSniper ? 0.05 : 0.1;
    currentWeapon.position.z += recoilAmount;
    setTimeout(() => currentWeapon.position.copy(originalPosition), 100);
  }
  
  function showPhaseIntro(phaseText, callback) {
    phaseIntro.textContent = phaseText;
    phaseIntro.style.display = 'block';
    playClickSound();
    callback(() => {
      setTimeout(() => {
        phaseIntro.style.display = 'none';
        startPhaseTimer();
      }, 1500);
    });
  }
  
  function handleHit(hitTarget) {
    if (!hitTarget || hitTarget.hit) return;
    hitTarget.hit = true;
  
    if (!hitTarget.isGoodTarget) {
      const points = isSniper ? 200 : 100;
      score += points;
      if (wave === 1) phase1Score += points;
      else phase2Score += points;
      scoreElement.textContent = score;
      let opacity = 0.9;
      const fadeInterval = setInterval(() => {
        opacity -= 0.1;
        hitTarget.mesh.traverse((child) => {
          if (child.isMesh) child.material.opacity = opacity;
          if (child.isMesh) child.material.color.setHex(0x00ff00);
        });
        hitTarget.mesh.scale.multiplyScalar(1.05);
        if (opacity <= 0) {
          scene.remove(hitTarget.mesh);
          clearInterval(fadeInterval);
        }
      }, 40);
      const remainingBadTargets = targets.filter(t => !t.isGoodTarget && !t.hit).length;
      targetsLeftElement.textContent = remainingBadTargets;
      if (remainingBadTargets === 0 && timeLeft > 0) {
        if (wave === 1) {
          transitionToPhase2();
        } else {
          endGame();
        }
      }
    } else {
      const penalty = isSniper ? 100 : 50;
      score -= penalty;
      if (wave === 1) phase1Score -= penalty;
      else phase2Score -= penalty;
      updateScoreDisplay();
      playMistakeSound();
  
      hitTarget.mesh.traverse((child) => {
        if (child.isMesh) {
          child.material.color.multiplyScalar(0.5);
          child.material.opacity = 0.5;
          child.material.transparent = true;
        }
      });
  
      const originalPosition = hitTarget.mesh.position.clone();
      const shakeIntensity = 0.5;
      let shakesRemaining = 5;
      const shakeInterval = setInterval(() => {
        if (shakesRemaining <= 0) {
          hitTarget.mesh.position.copy(originalPosition);
          clearInterval(shakeInterval);
        } else {
          hitTarget.mesh.position.set(
            originalPosition.x + (Math.random() - 0.5) * shakeIntensity,
            originalPosition.y + (Math.random() - 0.5) * shakeIntensity,
            originalPosition.z + (Math.random() - 0.5) * shakeIntensity
          );
          shakesRemaining--;
        }
      }, 50);
    }
  }
  
  function transitionToPhase2() {
    clearInterval(phaseTimer);
    isGameRunning = false;
    wave = 2;
    isSniper = true;
    weapons.scatteredWeapon.visible = false;
    weapons.precisionWeapon.visible = true;
    crosshair.innerHTML = `<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="2" fill="red"/><line x1="16" y1="6" x2="16" y2="12" stroke="red" stroke-width="1"/><line x1="16" y1="20" x2="16" y2="26" stroke="red" stroke-width="1"/><line x1="6" y1="16" x2="12" y2="16" stroke="red" stroke-width="1"/><line x1="20" y1="16" x2="26" y2="16" stroke="red" stroke-width="1"/></svg>`;
    phaseHud.src = "assets/ui/Phase-2-score.png";
    weaponImage.src = "assets/ui/Phase-2-weapon.png";
    weaponImage.style.width = "500px"; // Larger size for Phase 2
    showPhaseIntro("Phase 2: Precision Targeting", (done) => {
      createTargets(() => {
        done();
        isGameRunning = true;
      });
    });
  }
  
  function animate(currentTime) {
    requestAnimationFrame(animate);
    if (!isGameRunning) return;
    if (currentTime - lastFrameTime < FRAME_TIME) return;
    lastFrameTime = currentTime;
    const time = currentTime * 0.001;
  
    targets.forEach(target => {
      if (!target.hit) {
        let newX = target.basePosition.x + Math.sin(time * target.speed + target.phase) * target.moveRangeX;
        let newY = target.basePosition.y;
        let newZ = target.basePosition.z;
        newY += Math.sin(time * target.speed * 1.5 + target.phase) * 0.5;
        targets.forEach(otherTarget => {
          if (otherTarget !== target && !otherTarget.hit) {
            const dx = newX - otherTarget.mesh.position.x;
            const dy = newY - otherTarget.mesh.position.y;
            const dz = newZ - otherTarget.mesh.position.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance < MIN_DISTANCE) {
              const pushFactor = (MIN_DISTANCE - distance) / MIN_DISTANCE * 0.5;
              newX += dx * pushFactor;
              newY += dy * pushFactor * 0.2;
              newZ += dz * pushFactor * 0.1;
            }
          }
        });
  
        newX = THREE.MathUtils.clamp(newX, -70, 70);
        newY = THREE.MathUtils.clamp(newY, 1, 3);
        newZ = THREE.MathUtils.clamp(newZ, target.basePosition.z - 5, target.basePosition.z + 5);
        target.mesh.position.set(newX, newY, newZ);
      }
    });
  
    renderer.render(scene, camera);
  }
  
  function startGame() {
    if (!weapons) {
      console.error('Weapons not loaded yet. Please wait.');
      return;
    }
    doctorName = nameInput.value.trim() || "Unknown Doctor";
    score = 0;
    phase1Score = 0;
    phase2Score = 0;
    wave = 1;
    isSniper = false;
    updateScoreDisplay();
    targetsLeftElement.textContent = '5';
    weapons.scatteredWeapon.visible = true;
    weapons.precisionWeapon.visible = false;
    crosshair.innerHTML = `<svg width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="44" stroke="yellow" stroke-width="2" fill="none"/><circle cx="48" cy="48" r="12" fill="rgba(255,255,0,0.5)"/></svg>`;
    camera.position.set(0, 10, 50);
    camera.rotation.set(0, 0, 0);
    instructionsPopup.style.display = 'none';
    gameOverPopup.style.display = 'none';
    topScoresModal.style.display = 'none';
    savedResultsModal.style.display = 'none';
    phaseHud.src = "assets/ui/Phase-1-score.png";
    phaseHud.style.display = 'block';
    hud.style.display = 'inline-flex';
    weaponImage.src = "assets/ui/Phase-1-weapon.png";
    weaponImage.style.width = "370px"; // Reset to default for Phase 1
    weaponImage.style.display = 'block';
    logo.style.display = 'block';
    restartGameButton.style.display = 'block';
    sponsorBillboard.visible = true;
    isGameRunning = true;
    if (!isMuted) {
      backgroundMusic.currentTime = 0;
      backgroundMusic.play();
    }
    renderer.domElement.requestPointerLock();
    renderer.domElement.style.cursor = 'none';
    showPhaseIntro("Phase 1: Scattered Distribution", (done) => {
      createTargets(() => {
        done();
      });
    });
    animate(performance.now());
  }
  
  function restartWithNewName() {
    clearInterval(phaseTimer);
    gameOverPopup.style.display = 'none';
    instructionsPopup.style.display = 'block';
    nameInput.value = '';
    nameInput.removeAttribute('readonly');
    nameInput.removeAttribute('disabled');
    score = 0;
    phase1Score = 0;
    phase2Score = 0;
    wave = 1;
    isSniper = false;
    updateScoreDisplay();
    targetsLeftElement.textContent = '0';
    weapons.scatteredWeapon.visible = true;
    weapons.precisionWeapon.visible = false;
    crosshair.innerHTML = `<svg width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="44" stroke="yellow" stroke-width="2" fill="none"/><circle cx="48" cy="48" r="12" fill="rgba(255,255,0,0.5)"/></svg>`;
    camera.position.set(0, 10, 50);
    camera.rotation.set(0, 0, 0);
    targets.forEach(target => scene.remove(target.mesh));
    targets = [];
    phaseHud.style.display = 'none';
    hud.style.display = 'none';
    weaponImage.style.display = 'none';
    timerElement.style.display = 'none';
    logo.style.display = 'none';
    restartGameButton.style.display = 'none';
    sponsorBillboard.visible = false;
    isGameRunning = false;
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  
    document.exitPointerLock();
    renderer.domElement.style.cursor = 'auto';
  
    const focusInput = () => {
      nameInput.focus();
      nameInput.select();
      console.log('Input focused:', document.activeElement === nameInput);
      if (typeof require === 'function' && require('electron')) {
        const { remote } = require('electron');
        const win = remote.getCurrentWindow();
        if (!win.isFocused()) {
          win.focus();
        }
      }
    };
  
    document.addEventListener('pointerlockchange', function onLockChange() {
      if (document.pointerLockElement === null) {
        setTimeout(focusInput, 200);
        document.removeEventListener('pointerlockchange', onLockChange);
      }
    }, { once: true });
  
    nameInput.addEventListener('click', focusInput, { once: true });
    window.addEventListener('focus', focusInput, { once: true });
  }
  
  function endGame() {
    clearInterval(phaseTimer);
    isGameRunning = false;
    phase1ScoreElement.textContent = phase1Score;
    phase2ScoreElement.textContent = phase2Score;
    finalScoreElement.textContent = score;
    doctorNameDisplay.textContent = doctorName;
    playClickSound();
    gameOverPopup.style.display = 'block';
    phaseHud.style.display = 'none';
    hud.style.display = 'none';
    weaponImage.style.display = 'none';
    timerElement.style.display = 'none';
    logo.style.display = 'none';
    restartGameButton.style.display = 'none';
    sponsorBillboard.visible = false;
    document.exitPointerLock();
    renderer.domElement.style.cursor = 'auto';
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    saveScoreToFile();
  }
  
  function viewSavedResults() {
    let resultsData = [];
  
    if (typeof require === 'function' && require('electron')) {
      const fs = require('fs');
      const filePath = 'game_results.json';
      try {
        if (fs.existsSync(filePath)) {
          resultsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
      } catch (error) {
        console.error('Error reading file:', error);
        return;
      }
    } else {
      const savedData = localStorage.getItem('gameResults');
      if (savedData) {
        resultsData = JSON.parse(savedData);
      }
    }
  
    savedResultsList.innerHTML = '';
    if (resultsData.length > 0) {
      resultsData.forEach((entry, index) => {
        const li = document.createElement('li');
        const date = new Date(entry.date).toLocaleString();
        li.textContent = `${entry.doctorName}: Total ${entry.totalScore} (Phase 1: ${entry.phase1Score}, Phase 2: ${entry.phase2Score}) - ${date}`;
        savedResultsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No results saved yet.';
      savedResultsList.appendChild(li);
    }
  
    wasGameOverVisible = (gameOverPopup.style.display === 'block');
    wasInstructionsVisible = (instructionsPopup.style.display === 'block');
    gameOverPopup.style.display = 'none';
    instructionsPopup.style.display = 'none';
    topScoresModal.style.display = 'none';
    savedResultsModal.style.display = 'block';
  
    const focusInput = () => {
      if (instructionsPopup.style.display === 'block') {
        nameInput.focus();
        nameInput.select();
        console.log('Input refocused after modal:', document.activeElement === nameInput);
      }
    };
    setTimeout(focusInput, 200);
  }
  
  function closeSavedResults() {
    savedResultsModal.style.display = 'none';
    if (wasGameOverVisible) {
      gameOverPopup.style.display = 'block';
    } else if (wasInstructionsVisible) {
      instructionsPopup.style.display = 'block';
      const focusInput = () => {
        nameInput.focus();
        nameInput.select();
        console.log('Input focused after closing saved results:', document.activeElement === nameInput);
        if (typeof require === 'function' && require('electron')) {
          const { remote } = require('electron');
          const win = remote.getCurrentWindow();
          if (!win.isFocused()) {
            win.focus();
          }
        }
      };
      setTimeout(focusInput, 200);
    }
  }
  
  function viewTopScores() {
    let scoresData = [];
  
    if (typeof require === 'function' && require('electron')) {
      const fs = require('fs');
      const filePath = 'game_results.json';
      try {
        if (fs.existsSync(filePath)) {
          scoresData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
      } catch (error) {
        console.error('Error reading file:', error);
        return;
      }
    } else {
      const savedData = localStorage.getItem('gameResults');
      if (savedData) {
        scoresData = JSON.parse(savedData);
      }
    }
  
    const sortedScores = scoresData
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);
  
    topScoresList.innerHTML = '';
    if (sortedScores.length > 0) {
      sortedScores.forEach((entry, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${entry.doctorName}: ${entry.totalScore}`;
        topScoresList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No scores recorded yet.';
      topScoresList.appendChild(li);
    }
  
    wasGameOverVisible = (gameOverPopup.style.display === 'block');
    wasInstructionsVisible = (instructionsPopup.style.display === 'block');
    gameOverPopup.style.display = 'none';
    instructionsPopup.style.display = 'none';
    savedResultsModal.style.display = 'none';
    topScoresModal.style.display = 'block';
  
    const focusInput = () => {
      if (instructionsPopup.style.display === 'block') {
        nameInput.focus();
        nameInput.select();
        console.log('Input refocused after modal:', document.activeElement === nameInput);
      }
    };
    setTimeout(focusInput, 200);
  }
  
  function closeTopScores() {
    topScoresModal.style.display = 'none';
    if (wasGameOverVisible) {
      gameOverPopup.style.display = 'block';
    } else {
      instructionsPopup.style.display = 'block';
      const focusInput = () => {
        nameInput.focus();
        nameInput.select();
        console.log('Input focused after closing top scores:', document.activeElement === nameInput);
        if (typeof require === 'function' && require('electron')) {
          const { remote } = require('electron');
          const win = remote.getCurrentWindow();
          if (!win.isFocused()) {
            win.focus();
          }
        }
      };
      setTimeout(focusInput, 200);
    }
  }
  
  function init() {
    scene.background = new THREE.Color(0x000000);
    camera.position.set(0, 10, 50);
    scene.add(camera);
    createShootingRange();
    setupControls();
    createWeapons((loadedWeapons) => {
      weapons = loadedWeapons;
      startButton.addEventListener('click', () => { startGame(); playClickSound(); });
      restartButton.addEventListener('click', () => { startGame(); playClickSound(); });
      newNameButton.addEventListener('click', () => { restartWithNewName(); playClickSound(); });
      viewResultsButton.addEventListener('click', () => { viewSavedResults(); playClickSound(); });
      viewTopScoresButton.addEventListener('click', () => { viewTopScores(); playClickSound(); });
      viewTopScoresStartButton.addEventListener('click', () => { viewTopScores(); playClickSound(); });
      closeTopScoresButton.addEventListener('click', () => { closeTopScores(); playClickSound(); });
      closeSavedResultsButton.addEventListener('click', () => { closeSavedResults(); playClickSound(); });
      muteButton.addEventListener('click', () => { toggleMute(); playClickSound(); });
      restartGameButton.addEventListener('click', () => { restartWithNewName(); playClickSound(); });
    });
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    renderer.render(scene, camera);
  
    nameInput.focus();
    nameInput.select();
  }
  
  init();