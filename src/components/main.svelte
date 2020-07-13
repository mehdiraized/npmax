<script>
  import { projects, menuActive } from "../store";
  import { openDirectory, getProjectPackages } from "../utils/shell.js";
  let currentProjectID = false;
  let currentProject = {};
  let project = {};
  let packages = [];
  let dependencies = [];
  let devDependencies = [];
  menuActive.subscribe(async value => {
    currentProjectID = value ? value.split("_")[1] : false;
    currentProject = $projects.filter(item => {
      return item.id === parseInt(currentProjectID);
    })[0];
    if (currentProject) {
      const data = await getProjectPackages(currentProject.path).then(
        res => res
      );
      project = JSON.parse(data);
      dependencies = Object.entries(project.dependencies);
      devDependencies = Object.entries(project.devDependencies);
      let i = 1;
      for await (let item of dependencies) {
        packages = [
          ...packages,
          { id: i, name: item[0], current: item[1], dev: false }
        ];
        i++;
      }
      for await (let item of devDependencies) {
        packages = [
          ...packages,
          { id: i, name: item[0], current: item[1], dev: true }
        ];
        i++;
      }
    }
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
      border-collapse: collapse;
      thead {
        td {
          border: none;
          margin: 0;
          padding: 15px;
          background-color: rgba(0, 0, 0, 0.5);
          &:first-child {
            border-radius: 15px 0 0 0;
          }
          &:last-child {
            border-radius: 0 15px 0 0;
          }
        }
      }
      tbody {
        tr {
          td {
            padding: 15px;
            background-color: rgba(0, 0, 0, 0.2);
          }
          &:nth-child(2n) {
            background-color: rgba(0, 0, 0, 0.21);
          }
          &:last-child {
            td {
              &:first-child {
                border-radius: 0 0 0 15px;
              }
              &:last-child {
                border-radius: 0 0 15px 0;
              }
            }
          }
        }
      }
    }
  }
  .projectTable__title {
    padding-left: 15px;
  }

  .skeleton {
    width: 100%;
    background-color: rgba(255, 255, 255, 0.5);
    display: inline-block;
    height: 15px;
    -webkit-animation: change-opacity 2s linear infinite;
    animation: change-opacity 2s linear infinite;
    opacity: 0.3;
  }

  @keyframes change-opacity {
    0% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.3;
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
      <h1 class="projectTable__title">{currentProject.name}</h1>
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
        <tbody>
          {#if packages}
            {#each packages as { id, name, current, dev }}
              <tr id={`package_${id}`}>
                <td>{name}</td>
                <td>{current}</td>
                <td>
                  <span class="skeleton" />
                </td>
                <td>
                  <span class="skeleton" />
                </td>
                <td>
                  {#if dev}dev{/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </section>
  {/if}
</div>
