<script>
  import { projects, menuActive } from "../store";
  import { openDirectory } from "../utils/shell.js";
  let currentProjectID = false;
  let currentProject = {};
  menuActive.subscribe(value => {
    currentProjectID = value ? value.split("_")[1] : false;
    currentProject = $projects.filter(item => {
      return item.id === parseInt(currentProjectID);
    })[0];
  });
</script>

<style lang="scss">
  .content {
    background-color: #1d1d1d;
    width: 100%;
    border-left: 1px solid #000;
    padding: 10px;
  }

  .empty {
    text-align: center;
    color: #fff;
    font-size: 15px;
    display: flex;
    justify-items: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;

    img {
      width: 250px;
      margin-bottom: 15px;
    }

    button {
      cursor: pointer;
      background-color: #000;
      border: none;
      color: #fff;
      padding: 10px;
      border-radius: 5px;
      display: block;
    }
  }
  .projectTable {
    color: #fff;

    table {
      width: 100%;
      border: none;
      thead {
        td {
          border: none;
          margin: 0;
          background-color: #000;
        }
      }
    }
  }
</style>

<div class="content">
  {#if !currentProject}
    <section class="empty">
      <img src="./images/add.png" width="300" alt="" />
      <h1>Select Project to start</h1>
      <button
        on:click={() => {
          openDirectory()
            .then(result => {
              if (!result.canceled) {
                const projectPath = result.filePaths[0];
                const projectPathArray = result.filePaths[0].split('/');
                const projectName = projectPathArray[projectPathArray.length - 1];
                projects.set([
                  ...$projects,
                  {
                    id: $projects[$projects.length - 1]
                      ? $projects[$projects.length - 1].id + 1
                      : 0,
                    name: projectName,
                    path: projectPath
                  }
                ]);
                localStorage.setItem('projects', JSON.stringify($projects));
              }
            })
            .catch(err => {
              console.log(err);
            });
        }}>
        Add Project
      </button>
    </section>
  {:else}
    <section class="projectTable">
      <h1>{currentProject.name}</h1>
      <table>
        <thead>
          <tr>
            <td>Package</td>
            <td>Current</td>
            <td>Wanted</td>
            <td>Latest</td>
            <td>env</td>
          </tr>
        </thead>
      </table>
    </section>
  {/if}
</div>
