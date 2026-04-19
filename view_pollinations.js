async function run() {
  try {
    const res = await fetch("https://text.pollinations.ai/");
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
run();
