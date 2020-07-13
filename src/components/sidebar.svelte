<script>
  import { onMount } from "svelte";
  import { projects, menuActive } from "../store";
  import { globalPackages, openDirectory } from "../utils/shell.js";
  import { isJson } from "../utils/index.js";

  let packages = {};
  onMount(async () => {
    packages = isJson ? JSON.parse(localStorage.getItem("packages")) : {};
    projects.set(isJson ? JSON.parse(localStorage.getItem("projects")) : []);
    packages = await globalPackages().then(res => res);
    localStorage.setItem("packages", JSON.stringify(packages));
  });
</script>

<style lang="scss">
  .sidebar {
    background: rgba(0, 0, 0, 0.1);
    width: 250px;
    height: 100vh;
    color: #fff;
    box-sizing: border-box;
    padding: 50px 15px;
    overflow-x: auto;
    -webkit-app-region: drag;
    -webkit-user-select: none;
    position: sticky;
    top: 0;
  }
  .sidebarList__title {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.2);
    display: block;
  }
  .sidebarList {
    margin-bottom: 15px;
  }
  .sidebarList__item {
    text-align: left;
    width: 100%;
    border: none;
    color: #fff;
    padding: 7px 15px;
    background-color: transparent;
    border-radius: 7px;
    font-size: 14px;
    display: block;
    height: 30px;
    line-height: normal;
    transition: all 0.3s ease-in-out;
    span {
      float: right;
      background-color: rgba(255, 255, 255, 0.1);
      color: #fff;
      padding: 1px 5px 0;
      border-radius: 50px;
      font-size: 12px;
      transition: all 0.3s ease-in-out;
    }
    &:hover {
      .ui__iconGlobal {
        fill: red;
      }
      .ui__iconProject {
        fill: #fff;
      }
    }
    &.active {
      background-color: rgba(255, 255, 255, 0.1);
      span {
        background-color: rgba(255, 255, 255, 0.2);
      }
      .sidebarList__itemRemove {
        opacity: 1;
      }
      .ui__iconGlobal {
        fill: red;
      }
      .ui__iconProject {
        fill: #fff;
      }
    }
  }
  .sidebarList__itemRemove {
    opacity: 0;
    transition: all 0.3s ease-in-out;
    float: right;
    background-color: rgba(255, 255, 255, 0.1);
    width: 20px;
    height: 20px;
    border-radius: 20px;
    border: none;
    line-height: 14px;
    font-size: 16px;
    color: #fff;
    margin-top: -2px;
    text-align: center;
    padding: 0px 1px 0px 0px;

    &:hover {
      background-color: rgba(0, 0, 0, 1);
      color: #fff;
    }
  }
  .ui__iconProject {
    width: 18px;
    margin-right: 15px;
    float: left;
    line-height: 0;
    margin-top: -1px;
    stroke: #fff;
    transition: all 0.3s ease-in-out;
    fill: transparent;
  }
  .ui__iconGlobal {
    width: 25px;
    margin-right: 15px;
    float: left;
    line-height: 0;
    margin-top: -5px;
    transition: all 0.3s ease-in-out;
    fill: #fff;
  }
  .addProject {
    width: 100%;
    border: none;
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.3);
    color: #fff;
    padding: 10px;
    border-radius: 5px;
    display: block;
  }
</style>

<aside class="sidebar">
  <section class="sidebarList">
    <h1 class="sidebarList__title">Globals</h1>
    {#if packages.npm}
      <button
        class:active={$menuActive === `global_1`}
        class="sidebarList__item"
        on:click={() => {
          menuActive.set(`global_1`);
        }}>
        <svg
          class="ui__iconGlobal"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 0 10 L 0 21 L 9 21 L 9 23 L 16 23 L 16 21 L 32 21 L 32 10 L 0
            10 z M 1.7773438 11.777344 L 8.8886719 11.777344 L 8.890625
            11.777344 L 8.890625 19.445312 L 7.1113281 19.445312 L 7.1113281
            13.556641 L 5.3339844 13.556641 L 5.3339844 19.445312 L 1.7773438
            19.445312 L 1.7773438 11.777344 z M 10.667969 11.777344 L 17.777344
            11.777344 L 17.779297 11.777344 L 17.779297 19.443359 L 14.222656
            19.443359 L 14.222656 21.222656 L 10.667969 21.222656 L 10.667969
            11.777344 z M 19.556641 11.777344 L 30.222656 11.777344 L 30.224609
            11.777344 L 30.224609 19.445312 L 28.445312 19.445312 L 28.445312
            13.556641 L 26.667969 13.556641 L 26.667969 19.445312 L 24.890625
            19.445312 L 24.890625 13.556641 L 23.111328 13.556641 L 23.111328
            19.445312 L 19.556641 19.445312 L 19.556641 11.777344 z M 14.222656
            13.556641 L 14.222656 17.667969 L 16 17.667969 L 16 13.556641 L
            14.222656 13.556641 z" />
        </svg>
        Npm
        <span>{packages.npm}</span>
      </button>
    {/if}
    {#if packages.yarn}
      <button
        class:active={$menuActive === `global_2`}
        class="sidebarList__item"
        on:click={() => {
          menuActive.set(`global_2`);
        }}>
        <svg
          class="ui__iconGlobal"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 16 3 C 8.8 3 3 8.8 3 16 C 3 23.2 8.8 29 16 29 C 23.2 29 29 23.2
            29 16 C 29 8.8 23.2 3 16 3 z M 16 5 C 22.1 5 27 9.9 27 16 C 27 22.1
            22.1 27 16 27 C 9.9 27 5 22.1 5 16 C 5 9.9 9.9 5 16 5 z M 16.208984
            9.0449219 C 15.75918 9.1214844 15.300781 10.5 15.300781 10.5 C
            15.300781 10.5 14.099609 10.300781 13.099609 11.300781 C 12.899609
            11.500781 12.700391 11.599219 12.400391 11.699219 C 12.300391
            11.799219 12.2 11.800391 12 12.400391 C 11.6 13.300391 12.599609
            14.400391 12.599609 14.400391 C 10.499609 15.900391 10.599219
            17.900391 10.699219 18.400391 C 9.3992187 19.500391 9.8992187
            20.900781 10.199219 21.300781 C 10.399219 21.600781 10.599219 21.5
            10.699219 21.5 C 10.699219 21.6 10.199219 22.200391 10.699219
            22.400391 C 11.199219 22.700391 12.000391 22.800391 12.400391
            22.400391 C 12.700391 22.100391 12.800391 21.499219 12.900391
            21.199219 C 13.000391 21.099219 13.000391 21.399609 13.400391
            21.599609 C 13.400391 21.599609 12.7 21.899609 13 22.599609 C 13.1
            22.799609 13.4 23 14 23 C 14.2 23 16.599219 22.899219 17.199219
            22.699219 C 17.599219 22.599219 17.699219 22.400391 17.699219
            22.400391 C 20.299219 21.700391 20.799609 20.599219 22.599609
            20.199219 C 23.199609 20.099219 23.199609 19.099219 22.099609
            19.199219 C 21.299609 19.199219 20.6 19.6 20 20 C 19 20.6 18.300781
            20.699609 18.300781 20.599609 C 18.200781 20.499609 18.699219 19.3
            18.199219 18 C 17.699219 16.6 16.800391 16.199609 16.900391
            16.099609 C 17.200391 15.599609 17.899219 14.800391 18.199219
            13.400391 C 18.299219 12.500391 18.300391 11.000781 17.900391
            10.300781 C 17.800391 10.100781 17.199219 10.5 17.199219 10.5 C
            17.199219 10.5 16.600391 9.1996094 16.400391 9.0996094 C 16.337891
            9.0496094 16.273242 9.0339844 16.208984 9.0449219 z" />
        </svg>
        Yarn
        <span>{packages.yarn}</span>
      </button>
    {/if}
    {#if packages.pnpm}
      <button
        class:active={$menuActive === `global_3`}
        class="sidebarList__item"
        on:click={() => {
          menuActive.set(`global_3`);
        }}>
        <svg
          class="ui__iconGlobal"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 16 3 C 8.8 3 3 8.8 3 16 C 3 23.2 8.8 29 16 29 C 23.2 29 29 23.2
            29 16 C 29 8.8 23.2 3 16 3 z M 16 5 C 22.1 5 27 9.9 27 16 C 27 22.1
            22.1 27 16 27 C 9.9 27 5 22.1 5 16 C 5 9.9 9.9 5 16 5 z M 16.208984
            9.0449219 C 15.75918 9.1214844 15.300781 10.5 15.300781 10.5 C
            15.300781 10.5 14.099609 10.300781 13.099609 11.300781 C 12.899609
            11.500781 12.700391 11.599219 12.400391 11.699219 C 12.300391
            11.799219 12.2 11.800391 12 12.400391 C 11.6 13.300391 12.599609
            14.400391 12.599609 14.400391 C 10.499609 15.900391 10.599219
            17.900391 10.699219 18.400391 C 9.3992187 19.500391 9.8992187
            20.900781 10.199219 21.300781 C 10.399219 21.600781 10.599219 21.5
            10.699219 21.5 C 10.699219 21.6 10.199219 22.200391 10.699219
            22.400391 C 11.199219 22.700391 12.000391 22.800391 12.400391
            22.400391 C 12.700391 22.100391 12.800391 21.499219 12.900391
            21.199219 C 13.000391 21.099219 13.000391 21.399609 13.400391
            21.599609 C 13.400391 21.599609 12.7 21.899609 13 22.599609 C 13.1
            22.799609 13.4 23 14 23 C 14.2 23 16.599219 22.899219 17.199219
            22.699219 C 17.599219 22.599219 17.699219 22.400391 17.699219
            22.400391 C 20.299219 21.700391 20.799609 20.599219 22.599609
            20.199219 C 23.199609 20.099219 23.199609 19.099219 22.099609
            19.199219 C 21.299609 19.199219 20.6 19.6 20 20 C 19 20.6 18.300781
            20.699609 18.300781 20.599609 C 18.200781 20.499609 18.699219 19.3
            18.199219 18 C 17.699219 16.6 16.800391 16.199609 16.900391
            16.099609 C 17.200391 15.599609 17.899219 14.800391 18.199219
            13.400391 C 18.299219 12.500391 18.300391 11.000781 17.900391
            10.300781 C 17.800391 10.100781 17.199219 10.5 17.199219 10.5 C
            17.199219 10.5 16.600391 9.1996094 16.400391 9.0996094 C 16.337891
            9.0496094 16.273242 9.0339844 16.208984 9.0449219 z" />
        </svg>
        Pnpm
        <span>{packages.pnpm}</span>
      </button>
    {/if}
  </section>
  <section class="sidebarList">
    <h1 class="sidebarList__title">Projects</h1>
    {#if $projects}
      {#each $projects as { id, name, path }}
        <button
          class:active={$menuActive === `project_${id}`}
          class="sidebarList__item"
          on:click={() => {
            menuActive.set(`project_${id}`);
          }}>
          <svg
            class="ui__iconProject"
            strokeLinecap="round"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2
              2 0 0 1 2 2z" />
          </svg>
          {name}
          <button
            class="sidebarList__itemRemove"
            on:click={() => {
              const projectFilter = $projects.filter(item => {
                return item.id !== id;
              });
              projects.set(projectFilter);
              menuActive.set(null);
              localStorage.setItem('projects', JSON.stringify(projectFilter));
            }}>
            &times;
          </button>
        </button>
      {/each}
    {/if}
  </section>
  <button
    class="addProject"
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
</aside>
