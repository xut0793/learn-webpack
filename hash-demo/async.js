export default function append() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = `This is async loaded modified runtime`
  document.body.appendChild(eleDiv)
}