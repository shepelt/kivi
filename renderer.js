import * as THREE from 'three';

// Initialize the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87ceeb); // Sky blue background
document.body.appendChild(renderer.domElement);

// Create the scene
const scene = new THREE.Scene();

// Set up isometric camera
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 10;
const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  1000
);

// Position camera for isometric view
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);

// Create a simple cube
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({
  color: 0x44aa88,
  flatShading: true // Low-poly look
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Add grid helper for reference
const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

// Handle window resize
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = frustumSize * aspect / -2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Slowly rotate the cube
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

animate();
