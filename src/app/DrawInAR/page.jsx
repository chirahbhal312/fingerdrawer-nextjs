const startARScene = () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true
  document.body.appendChild(renderer.domElement)

  const arButton = ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  document.body.appendChild(arButton)

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1)
  scene.add(light)

  const imageURL = sessionStorage.getItem("drawingImage")
  const image = new Image()
  image.src = imageURL
  image.onload = () => {
    const texture = new THREE.Texture(image)
    texture.needsUpdate = true

    // Scale image dimensions for AR (0.5m max width)
    const maxPlaneWidth = 0.5
    const aspect = image.width / image.height
    const width = maxPlaneWidth
    const height = width / aspect

    const geometry = new THREE.PlaneGeometry(width, height)
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
    const plane = new THREE.Mesh(geometry, material)
    plane.position.set(0, 0, -0.5) // Half meter in front
    scene.add(plane)

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera)
    })
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })
}
