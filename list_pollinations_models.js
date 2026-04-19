async function run() {
  try {
    const res = await fetch("https://gen.pollinations.ai/v1/models");
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
run();
