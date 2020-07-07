<script>
  import Sidebar from "./components/sidebar.svelte";
  import Main from "./components/main.svelte";
</script>

<style type="text/scss">
  .main {
    display: flex;
    height: 100vh;
    width: 100vw;
  }
</style>

<main class="main">
  <Sidebar />
  <Main />
</main>
