async function run() {
  try {
    const res = await fetch("https://gen.pollinations.ai/v1/models");
    const data = await res.json();
    data.data.forEach(m => console.log(m.id));
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
run();
