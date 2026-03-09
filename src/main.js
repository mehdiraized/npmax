import { mount } from "svelte";
import App from "./App.svelte";

// Set platform class for CSS-based platform-specific styling
document.body.setAttribute("data-platform", process.platform);

const app = mount(App, {
	target: document.body,
});

export default app;
