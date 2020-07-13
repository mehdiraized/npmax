
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const projects = writable([]);
    const menuActive = writable(null);

    // const fixPath = require("fix-path");
    // fixPath();
    const util = require("util");
    const fs = require("fs");
    const { dialog } = require("electron").remote;
    const exec = util.promisify(require("child_process").exec);
    const readFile = util.promisify(fs.readFile);

    const globalPackages = async () => {
      let yarn = await yarnPackages();
      let npm = await npmPackages();
      let pnpm = await pnpmPackages();
      return {
        yarn,
        npm,
        pnpm,
      };
    };

    const openDirectory = async () => {
      return dialog.showOpenDialog({
        properties: ["openDirectory"],
      });
    };

    const getProjectPackages = (path) => {
      return readFile(`${path}/package.json`, "utf-8");
    };

    const yarnPackages = async () => {
      try {
        const { stdout } = await exec("yarn -v");
        return stdout;
      } catch (err) {
        return false;
      }
    };

    const npmPackages = async () => {
      try {
        const { stdout } = await exec("npm -v");
        return stdout;
      } catch (err) {
        return false;
      }
    };

    const pnpmPackages = async () => {
      try {
        const { stdout } = await exec("pnpm -v");
        return stdout;
      } catch (err) {
        return false;
      }
    };

    const isJson = (str) => {
      try {
        JSON.parse(str);
      } catch (e) {
        return false;
      }
      return true;
    };

    /* src/components/sidebar.svelte generated by Svelte v3.23.2 */

    const { console: console_1 } = globals;
    const file = "src/components/sidebar.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-omlqvb-style";
    	style.textContent = ".sidebar.svelte-omlqvb.svelte-omlqvb{background:rgba(0, 0, 0, 0.1);width:250px;height:100vh;color:#fff;box-sizing:border-box;padding:50px 15px 15px;overflow-x:auto;-webkit-app-region:drag;-webkit-user-select:none;position:sticky;top:0}.sidebarList__title.svelte-omlqvb.svelte-omlqvb{font-size:11px;font-weight:500;letter-spacing:0.5px;color:rgba(255, 255, 255, 0.2);display:block}.sidebarList.svelte-omlqvb.svelte-omlqvb{margin-bottom:15px}.sidebarList__item.svelte-omlqvb.svelte-omlqvb{text-align:left;width:100%;border:none;color:#fff;padding:7px 15px;background-color:transparent;border-radius:7px;font-size:14px;display:block;height:30px;line-height:normal;transition:all 0.3s ease-in-out;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sidebarList__item.svelte-omlqvb span.svelte-omlqvb{float:right;background-color:rgba(255, 255, 255, 0.1);color:#fff;padding:1px 5px 0;border-radius:50px;font-size:12px;transition:all 0.3s ease-in-out}.sidebarList__item.svelte-omlqvb:hover .ui__iconGlobal.svelte-omlqvb{fill:red}.sidebarList__item.svelte-omlqvb:hover .ui__iconProject.svelte-omlqvb{fill:#fff}.sidebarList__item.active.svelte-omlqvb.svelte-omlqvb{background-color:rgba(255, 255, 255, 0.1)}.sidebarList__item.active.svelte-omlqvb span.svelte-omlqvb{background-color:rgba(255, 255, 255, 0.2)}.sidebarList__item.active.svelte-omlqvb .sidebarList__itemRemove.svelte-omlqvb{opacity:1}.sidebarList__item.active.svelte-omlqvb .ui__iconGlobal.svelte-omlqvb{fill:red}.sidebarList__item.active.svelte-omlqvb .ui__iconProject.svelte-omlqvb{fill:#fff}.sidebarList__itemRemove.svelte-omlqvb.svelte-omlqvb{opacity:0;transition:all 0.3s ease-in-out;float:right;background-color:rgba(255, 255, 255, 0.1);width:20px;height:20px;border-radius:20px;border:none;line-height:14px;font-size:16px;color:#fff;margin-top:-2px;text-align:center;padding:0px 1px 0px 0px}.sidebarList__itemRemove.svelte-omlqvb.svelte-omlqvb:hover{background-color:black;color:#fff}.ui__iconProject.svelte-omlqvb.svelte-omlqvb{width:18px;margin-right:15px;float:left;line-height:0;margin-top:-1px;stroke:#fff;transition:all 0.3s ease-in-out;fill:transparent}.ui__iconGlobal.svelte-omlqvb.svelte-omlqvb{width:25px;margin-right:15px;float:left;line-height:0;margin-top:-5px;transition:all 0.3s ease-in-out;fill:#fff}.addProject.svelte-omlqvb.svelte-omlqvb{width:100%;border:none;cursor:pointer;background-color:rgba(0, 0, 0, 0.3);color:#fff;padding:10px;border-radius:5px;display:block}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhci5zdmVsdGUiLCJzb3VyY2VzIjpbInNpZGViYXIuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG5pbXBvcnQgeyBvbk1vdW50IH0gZnJvbSBcInN2ZWx0ZVwiO1xuaW1wb3J0IHsgcHJvamVjdHMsIG1lbnVBY3RpdmUgfSBmcm9tIFwiLi4vc3RvcmVcIjtcbmltcG9ydCB7IGdsb2JhbFBhY2thZ2VzLCBvcGVuRGlyZWN0b3J5IH0gZnJvbSBcIi4uL3V0aWxzL3NoZWxsLmpzXCI7XG5pbXBvcnQgeyBpc0pzb24gfSBmcm9tIFwiLi4vdXRpbHMvaW5kZXguanNcIjtcblxubGV0IHBhY2thZ2VzID0ge307XG5vbk1vdW50KGFzeW5jICgpID0+IHtcbiAgcGFja2FnZXMgPSBpc0pzb24gPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicGFja2FnZXNcIikpIDoge307XG4gIHByb2plY3RzLnNldChpc0pzb24gPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicHJvamVjdHNcIikpIDogW10pO1xuICBwYWNrYWdlcyA9IGF3YWl0IGdsb2JhbFBhY2thZ2VzKCkudGhlbihyZXMgPT4gcmVzKTtcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJwYWNrYWdlc1wiLCBKU09OLnN0cmluZ2lmeShwYWNrYWdlcykpO1xufSk7XG48L3NjcmlwdD5cblxuPHN0eWxlIGxhbmc9XCJzY3NzXCI+LnNpZGViYXIge1xuICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuMSk7XG4gIHdpZHRoOiAyNTBweDtcbiAgaGVpZ2h0OiAxMDB2aDtcbiAgY29sb3I6ICNmZmY7XG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gIHBhZGRpbmc6IDUwcHggMTVweCAxNXB4O1xuICBvdmVyZmxvdy14OiBhdXRvO1xuICAtd2Via2l0LWFwcC1yZWdpb246IGRyYWc7XG4gIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7XG4gIHBvc2l0aW9uOiBzdGlja3k7XG4gIHRvcDogMDsgfVxuXG4uc2lkZWJhckxpc3RfX3RpdGxlIHtcbiAgZm9udC1zaXplOiAxMXB4O1xuICBmb250LXdlaWdodDogNTAwO1xuICBsZXR0ZXItc3BhY2luZzogMC41cHg7XG4gIGNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMik7XG4gIGRpc3BsYXk6IGJsb2NrOyB9XG5cbi5zaWRlYmFyTGlzdCB7XG4gIG1hcmdpbi1ib3R0b206IDE1cHg7IH1cblxuLnNpZGViYXJMaXN0X19pdGVtIHtcbiAgdGV4dC1hbGlnbjogbGVmdDtcbiAgd2lkdGg6IDEwMCU7XG4gIGJvcmRlcjogbm9uZTtcbiAgY29sb3I6ICNmZmY7XG4gIHBhZGRpbmc6IDdweCAxNXB4O1xuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcbiAgYm9yZGVyLXJhZGl1czogN3B4O1xuICBmb250LXNpemU6IDE0cHg7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICBoZWlnaHQ6IDMwcHg7XG4gIGxpbmUtaGVpZ2h0OiBub3JtYWw7XG4gIHRyYW5zaXRpb246IGFsbCAwLjNzIGVhc2UtaW4tb3V0O1xuICB3aGl0ZS1zcGFjZTogbm93cmFwO1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgfVxuICAuc2lkZWJhckxpc3RfX2l0ZW0gc3BhbiB7XG4gICAgZmxvYXQ6IHJpZ2h0O1xuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKTtcbiAgICBjb2xvcjogI2ZmZjtcbiAgICBwYWRkaW5nOiAxcHggNXB4IDA7XG4gICAgYm9yZGVyLXJhZGl1czogNTBweDtcbiAgICBmb250LXNpemU6IDEycHg7XG4gICAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7IH1cbiAgLnNpZGViYXJMaXN0X19pdGVtOmhvdmVyIC51aV9faWNvbkdsb2JhbCB7XG4gICAgZmlsbDogcmVkOyB9XG4gIC5zaWRlYmFyTGlzdF9faXRlbTpob3ZlciAudWlfX2ljb25Qcm9qZWN0IHtcbiAgICBmaWxsOiAjZmZmOyB9XG4gIC5zaWRlYmFyTGlzdF9faXRlbS5hY3RpdmUge1xuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKTsgfVxuICAgIC5zaWRlYmFyTGlzdF9faXRlbS5hY3RpdmUgc3BhbiB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMik7IH1cbiAgICAuc2lkZWJhckxpc3RfX2l0ZW0uYWN0aXZlIC5zaWRlYmFyTGlzdF9faXRlbVJlbW92ZSB7XG4gICAgICBvcGFjaXR5OiAxOyB9XG4gICAgLnNpZGViYXJMaXN0X19pdGVtLmFjdGl2ZSAudWlfX2ljb25HbG9iYWwge1xuICAgICAgZmlsbDogcmVkOyB9XG4gICAgLnNpZGViYXJMaXN0X19pdGVtLmFjdGl2ZSAudWlfX2ljb25Qcm9qZWN0IHtcbiAgICAgIGZpbGw6ICNmZmY7IH1cblxuLnNpZGViYXJMaXN0X19pdGVtUmVtb3ZlIHtcbiAgb3BhY2l0eTogMDtcbiAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7XG4gIGZsb2F0OiByaWdodDtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpO1xuICB3aWR0aDogMjBweDtcbiAgaGVpZ2h0OiAyMHB4O1xuICBib3JkZXItcmFkaXVzOiAyMHB4O1xuICBib3JkZXI6IG5vbmU7XG4gIGxpbmUtaGVpZ2h0OiAxNHB4O1xuICBmb250LXNpemU6IDE2cHg7XG4gIGNvbG9yOiAjZmZmO1xuICBtYXJnaW4tdG9wOiAtMnB4O1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIHBhZGRpbmc6IDBweCAxcHggMHB4IDBweDsgfVxuICAuc2lkZWJhckxpc3RfX2l0ZW1SZW1vdmU6aG92ZXIge1xuICAgIGJhY2tncm91bmQtY29sb3I6IGJsYWNrO1xuICAgIGNvbG9yOiAjZmZmOyB9XG5cbi51aV9faWNvblByb2plY3Qge1xuICB3aWR0aDogMThweDtcbiAgbWFyZ2luLXJpZ2h0OiAxNXB4O1xuICBmbG9hdDogbGVmdDtcbiAgbGluZS1oZWlnaHQ6IDA7XG4gIG1hcmdpbi10b3A6IC0xcHg7XG4gIHN0cm9rZTogI2ZmZjtcbiAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7XG4gIGZpbGw6IHRyYW5zcGFyZW50OyB9XG5cbi51aV9faWNvbkdsb2JhbCB7XG4gIHdpZHRoOiAyNXB4O1xuICBtYXJnaW4tcmlnaHQ6IDE1cHg7XG4gIGZsb2F0OiBsZWZ0O1xuICBsaW5lLWhlaWdodDogMDtcbiAgbWFyZ2luLXRvcDogLTVweDtcbiAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7XG4gIGZpbGw6ICNmZmY7IH1cblxuLmFkZFByb2plY3Qge1xuICB3aWR0aDogMTAwJTtcbiAgYm9yZGVyOiBub25lO1xuICBjdXJzb3I6IHBvaW50ZXI7XG4gIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC4zKTtcbiAgY29sb3I6ICNmZmY7XG4gIHBhZGRpbmc6IDEwcHg7XG4gIGJvcmRlci1yYWRpdXM6IDVweDtcbiAgZGlzcGxheTogYmxvY2s7IH1cbjwvc3R5bGU+XG5cbjxhc2lkZSBjbGFzcz1cInNpZGViYXJcIj5cbiAgPHNlY3Rpb24gY2xhc3M9XCJzaWRlYmFyTGlzdFwiPlxuICAgIDxoMSBjbGFzcz1cInNpZGViYXJMaXN0X190aXRsZVwiPkdsb2JhbHM8L2gxPlxuICAgIHsjaWYgcGFja2FnZXMubnBtfVxuICAgICAgPGJ1dHRvblxuICAgICAgICBjbGFzczphY3RpdmU9eyRtZW51QWN0aXZlID09PSBgZ2xvYmFsXzFgfVxuICAgICAgICBjbGFzcz1cInNpZGViYXJMaXN0X19pdGVtXCJcbiAgICAgICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgICAgICBtZW51QWN0aXZlLnNldChgZ2xvYmFsXzFgKTtcbiAgICAgICAgfX0+XG4gICAgICAgIDxzdmdcbiAgICAgICAgICBjbGFzcz1cInVpX19pY29uR2xvYmFsXCJcbiAgICAgICAgICB2aWV3Qm94PVwiMCAwIDMyIDMyXCJcbiAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgIGQ9XCJNIDAgMTAgTCAwIDIxIEwgOSAyMSBMIDkgMjMgTCAxNiAyMyBMIDE2IDIxIEwgMzIgMjEgTCAzMiAxMCBMIDBcbiAgICAgICAgICAgIDEwIHogTSAxLjc3NzM0MzggMTEuNzc3MzQ0IEwgOC44ODg2NzE5IDExLjc3NzM0NCBMIDguODkwNjI1XG4gICAgICAgICAgICAxMS43NzczNDQgTCA4Ljg5MDYyNSAxOS40NDUzMTIgTCA3LjExMTMyODEgMTkuNDQ1MzEyIEwgNy4xMTEzMjgxXG4gICAgICAgICAgICAxMy41NTY2NDEgTCA1LjMzMzk4NDQgMTMuNTU2NjQxIEwgNS4zMzM5ODQ0IDE5LjQ0NTMxMiBMIDEuNzc3MzQzOFxuICAgICAgICAgICAgMTkuNDQ1MzEyIEwgMS43NzczNDM4IDExLjc3NzM0NCB6IE0gMTAuNjY3OTY5IDExLjc3NzM0NCBMIDE3Ljc3NzM0NFxuICAgICAgICAgICAgMTEuNzc3MzQ0IEwgMTcuNzc5Mjk3IDExLjc3NzM0NCBMIDE3Ljc3OTI5NyAxOS40NDMzNTkgTCAxNC4yMjI2NTZcbiAgICAgICAgICAgIDE5LjQ0MzM1OSBMIDE0LjIyMjY1NiAyMS4yMjI2NTYgTCAxMC42Njc5NjkgMjEuMjIyNjU2IEwgMTAuNjY3OTY5XG4gICAgICAgICAgICAxMS43NzczNDQgeiBNIDE5LjU1NjY0MSAxMS43NzczNDQgTCAzMC4yMjI2NTYgMTEuNzc3MzQ0IEwgMzAuMjI0NjA5XG4gICAgICAgICAgICAxMS43NzczNDQgTCAzMC4yMjQ2MDkgMTkuNDQ1MzEyIEwgMjguNDQ1MzEyIDE5LjQ0NTMxMiBMIDI4LjQ0NTMxMlxuICAgICAgICAgICAgMTMuNTU2NjQxIEwgMjYuNjY3OTY5IDEzLjU1NjY0MSBMIDI2LjY2Nzk2OSAxOS40NDUzMTIgTCAyNC44OTA2MjVcbiAgICAgICAgICAgIDE5LjQ0NTMxMiBMIDI0Ljg5MDYyNSAxMy41NTY2NDEgTCAyMy4xMTEzMjggMTMuNTU2NjQxIEwgMjMuMTExMzI4XG4gICAgICAgICAgICAxOS40NDUzMTIgTCAxOS41NTY2NDEgMTkuNDQ1MzEyIEwgMTkuNTU2NjQxIDExLjc3NzM0NCB6IE0gMTQuMjIyNjU2XG4gICAgICAgICAgICAxMy41NTY2NDEgTCAxNC4yMjI2NTYgMTcuNjY3OTY5IEwgMTYgMTcuNjY3OTY5IEwgMTYgMTMuNTU2NjQxIExcbiAgICAgICAgICAgIDE0LjIyMjY1NiAxMy41NTY2NDEgelwiIC8+XG4gICAgICAgIDwvc3ZnPlxuICAgICAgICBOcG1cbiAgICAgICAgPHNwYW4+e3BhY2thZ2VzLm5wbX08L3NwYW4+XG4gICAgICA8L2J1dHRvbj5cbiAgICB7L2lmfVxuICAgIHsjaWYgcGFja2FnZXMueWFybn1cbiAgICAgIDxidXR0b25cbiAgICAgICAgY2xhc3M6YWN0aXZlPXskbWVudUFjdGl2ZSA9PT0gYGdsb2JhbF8yYH1cbiAgICAgICAgY2xhc3M9XCJzaWRlYmFyTGlzdF9faXRlbVwiXG4gICAgICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgbWVudUFjdGl2ZS5zZXQoYGdsb2JhbF8yYCk7XG4gICAgICAgIH19PlxuICAgICAgICA8c3ZnXG4gICAgICAgICAgY2xhc3M9XCJ1aV9faWNvbkdsb2JhbFwiXG4gICAgICAgICAgdmlld0JveD1cIjAgMCAzMiAzMlwiXG4gICAgICAgICAgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICBkPVwiTSAxNiAzIEMgOC44IDMgMyA4LjggMyAxNiBDIDMgMjMuMiA4LjggMjkgMTYgMjkgQyAyMy4yIDI5IDI5IDIzLjJcbiAgICAgICAgICAgIDI5IDE2IEMgMjkgOC44IDIzLjIgMyAxNiAzIHogTSAxNiA1IEMgMjIuMSA1IDI3IDkuOSAyNyAxNiBDIDI3IDIyLjFcbiAgICAgICAgICAgIDIyLjEgMjcgMTYgMjcgQyA5LjkgMjcgNSAyMi4xIDUgMTYgQyA1IDkuOSA5LjkgNSAxNiA1IHogTSAxNi4yMDg5ODRcbiAgICAgICAgICAgIDkuMDQ0OTIxOSBDIDE1Ljc1OTE4IDkuMTIxNDg0NCAxNS4zMDA3ODEgMTAuNSAxNS4zMDA3ODEgMTAuNSBDXG4gICAgICAgICAgICAxNS4zMDA3ODEgMTAuNSAxNC4wOTk2MDkgMTAuMzAwNzgxIDEzLjA5OTYwOSAxMS4zMDA3ODEgQyAxMi44OTk2MDlcbiAgICAgICAgICAgIDExLjUwMDc4MSAxMi43MDAzOTEgMTEuNTk5MjE5IDEyLjQwMDM5MSAxMS42OTkyMTkgQyAxMi4zMDAzOTFcbiAgICAgICAgICAgIDExLjc5OTIxOSAxMi4yIDExLjgwMDM5MSAxMiAxMi40MDAzOTEgQyAxMS42IDEzLjMwMDM5MSAxMi41OTk2MDlcbiAgICAgICAgICAgIDE0LjQwMDM5MSAxMi41OTk2MDkgMTQuNDAwMzkxIEMgMTAuNDk5NjA5IDE1LjkwMDM5MSAxMC41OTkyMTlcbiAgICAgICAgICAgIDE3LjkwMDM5MSAxMC42OTkyMTkgMTguNDAwMzkxIEMgOS4zOTkyMTg3IDE5LjUwMDM5MSA5Ljg5OTIxODdcbiAgICAgICAgICAgIDIwLjkwMDc4MSAxMC4xOTkyMTkgMjEuMzAwNzgxIEMgMTAuMzk5MjE5IDIxLjYwMDc4MSAxMC41OTkyMTkgMjEuNVxuICAgICAgICAgICAgMTAuNjk5MjE5IDIxLjUgQyAxMC42OTkyMTkgMjEuNiAxMC4xOTkyMTkgMjIuMjAwMzkxIDEwLjY5OTIxOVxuICAgICAgICAgICAgMjIuNDAwMzkxIEMgMTEuMTk5MjE5IDIyLjcwMDM5MSAxMi4wMDAzOTEgMjIuODAwMzkxIDEyLjQwMDM5MVxuICAgICAgICAgICAgMjIuNDAwMzkxIEMgMTIuNzAwMzkxIDIyLjEwMDM5MSAxMi44MDAzOTEgMjEuNDk5MjE5IDEyLjkwMDM5MVxuICAgICAgICAgICAgMjEuMTk5MjE5IEMgMTMuMDAwMzkxIDIxLjA5OTIxOSAxMy4wMDAzOTEgMjEuMzk5NjA5IDEzLjQwMDM5MVxuICAgICAgICAgICAgMjEuNTk5NjA5IEMgMTMuNDAwMzkxIDIxLjU5OTYwOSAxMi43IDIxLjg5OTYwOSAxMyAyMi41OTk2MDkgQyAxMy4xXG4gICAgICAgICAgICAyMi43OTk2MDkgMTMuNCAyMyAxNCAyMyBDIDE0LjIgMjMgMTYuNTk5MjE5IDIyLjg5OTIxOSAxNy4xOTkyMTlcbiAgICAgICAgICAgIDIyLjY5OTIxOSBDIDE3LjU5OTIxOSAyMi41OTkyMTkgMTcuNjk5MjE5IDIyLjQwMDM5MSAxNy42OTkyMTlcbiAgICAgICAgICAgIDIyLjQwMDM5MSBDIDIwLjI5OTIxOSAyMS43MDAzOTEgMjAuNzk5NjA5IDIwLjU5OTIxOSAyMi41OTk2MDlcbiAgICAgICAgICAgIDIwLjE5OTIxOSBDIDIzLjE5OTYwOSAyMC4wOTkyMTkgMjMuMTk5NjA5IDE5LjA5OTIxOSAyMi4wOTk2MDlcbiAgICAgICAgICAgIDE5LjE5OTIxOSBDIDIxLjI5OTYwOSAxOS4xOTkyMTkgMjAuNiAxOS42IDIwIDIwIEMgMTkgMjAuNiAxOC4zMDA3ODFcbiAgICAgICAgICAgIDIwLjY5OTYwOSAxOC4zMDA3ODEgMjAuNTk5NjA5IEMgMTguMjAwNzgxIDIwLjQ5OTYwOSAxOC42OTkyMTkgMTkuM1xuICAgICAgICAgICAgMTguMTk5MjE5IDE4IEMgMTcuNjk5MjE5IDE2LjYgMTYuODAwMzkxIDE2LjE5OTYwOSAxNi45MDAzOTFcbiAgICAgICAgICAgIDE2LjA5OTYwOSBDIDE3LjIwMDM5MSAxNS41OTk2MDkgMTcuODk5MjE5IDE0LjgwMDM5MSAxOC4xOTkyMTlcbiAgICAgICAgICAgIDEzLjQwMDM5MSBDIDE4LjI5OTIxOSAxMi41MDAzOTEgMTguMzAwMzkxIDExLjAwMDc4MSAxNy45MDAzOTFcbiAgICAgICAgICAgIDEwLjMwMDc4MSBDIDE3LjgwMDM5MSAxMC4xMDA3ODEgMTcuMTk5MjE5IDEwLjUgMTcuMTk5MjE5IDEwLjUgQ1xuICAgICAgICAgICAgMTcuMTk5MjE5IDEwLjUgMTYuNjAwMzkxIDkuMTk5NjA5NCAxNi40MDAzOTEgOS4wOTk2MDk0IEMgMTYuMzM3ODkxXG4gICAgICAgICAgICA5LjA0OTYwOTQgMTYuMjczMjQyIDkuMDMzOTg0NCAxNi4yMDg5ODQgOS4wNDQ5MjE5IHpcIiAvPlxuICAgICAgICA8L3N2Zz5cbiAgICAgICAgWWFyblxuICAgICAgICA8c3Bhbj57cGFja2FnZXMueWFybn08L3NwYW4+XG4gICAgICA8L2J1dHRvbj5cbiAgICB7L2lmfVxuICAgIHsjaWYgcGFja2FnZXMucG5wbX1cbiAgICAgIDxidXR0b25cbiAgICAgICAgY2xhc3M6YWN0aXZlPXskbWVudUFjdGl2ZSA9PT0gYGdsb2JhbF8zYH1cbiAgICAgICAgY2xhc3M9XCJzaWRlYmFyTGlzdF9faXRlbVwiXG4gICAgICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgbWVudUFjdGl2ZS5zZXQoYGdsb2JhbF8zYCk7XG4gICAgICAgIH19PlxuICAgICAgICA8c3ZnXG4gICAgICAgICAgY2xhc3M9XCJ1aV9faWNvbkdsb2JhbFwiXG4gICAgICAgICAgdmlld0JveD1cIjAgMCAzMiAzMlwiXG4gICAgICAgICAgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICBkPVwiTSAxNiAzIEMgOC44IDMgMyA4LjggMyAxNiBDIDMgMjMuMiA4LjggMjkgMTYgMjkgQyAyMy4yIDI5IDI5IDIzLjJcbiAgICAgICAgICAgIDI5IDE2IEMgMjkgOC44IDIzLjIgMyAxNiAzIHogTSAxNiA1IEMgMjIuMSA1IDI3IDkuOSAyNyAxNiBDIDI3IDIyLjFcbiAgICAgICAgICAgIDIyLjEgMjcgMTYgMjcgQyA5LjkgMjcgNSAyMi4xIDUgMTYgQyA1IDkuOSA5LjkgNSAxNiA1IHogTSAxNi4yMDg5ODRcbiAgICAgICAgICAgIDkuMDQ0OTIxOSBDIDE1Ljc1OTE4IDkuMTIxNDg0NCAxNS4zMDA3ODEgMTAuNSAxNS4zMDA3ODEgMTAuNSBDXG4gICAgICAgICAgICAxNS4zMDA3ODEgMTAuNSAxNC4wOTk2MDkgMTAuMzAwNzgxIDEzLjA5OTYwOSAxMS4zMDA3ODEgQyAxMi44OTk2MDlcbiAgICAgICAgICAgIDExLjUwMDc4MSAxMi43MDAzOTEgMTEuNTk5MjE5IDEyLjQwMDM5MSAxMS42OTkyMTkgQyAxMi4zMDAzOTFcbiAgICAgICAgICAgIDExLjc5OTIxOSAxMi4yIDExLjgwMDM5MSAxMiAxMi40MDAzOTEgQyAxMS42IDEzLjMwMDM5MSAxMi41OTk2MDlcbiAgICAgICAgICAgIDE0LjQwMDM5MSAxMi41OTk2MDkgMTQuNDAwMzkxIEMgMTAuNDk5NjA5IDE1LjkwMDM5MSAxMC41OTkyMTlcbiAgICAgICAgICAgIDE3LjkwMDM5MSAxMC42OTkyMTkgMTguNDAwMzkxIEMgOS4zOTkyMTg3IDE5LjUwMDM5MSA5Ljg5OTIxODdcbiAgICAgICAgICAgIDIwLjkwMDc4MSAxMC4xOTkyMTkgMjEuMzAwNzgxIEMgMTAuMzk5MjE5IDIxLjYwMDc4MSAxMC41OTkyMTkgMjEuNVxuICAgICAgICAgICAgMTAuNjk5MjE5IDIxLjUgQyAxMC42OTkyMTkgMjEuNiAxMC4xOTkyMTkgMjIuMjAwMzkxIDEwLjY5OTIxOVxuICAgICAgICAgICAgMjIuNDAwMzkxIEMgMTEuMTk5MjE5IDIyLjcwMDM5MSAxMi4wMDAzOTEgMjIuODAwMzkxIDEyLjQwMDM5MVxuICAgICAgICAgICAgMjIuNDAwMzkxIEMgMTIuNzAwMzkxIDIyLjEwMDM5MSAxMi44MDAzOTEgMjEuNDk5MjE5IDEyLjkwMDM5MVxuICAgICAgICAgICAgMjEuMTk5MjE5IEMgMTMuMDAwMzkxIDIxLjA5OTIxOSAxMy4wMDAzOTEgMjEuMzk5NjA5IDEzLjQwMDM5MVxuICAgICAgICAgICAgMjEuNTk5NjA5IEMgMTMuNDAwMzkxIDIxLjU5OTYwOSAxMi43IDIxLjg5OTYwOSAxMyAyMi41OTk2MDkgQyAxMy4xXG4gICAgICAgICAgICAyMi43OTk2MDkgMTMuNCAyMyAxNCAyMyBDIDE0LjIgMjMgMTYuNTk5MjE5IDIyLjg5OTIxOSAxNy4xOTkyMTlcbiAgICAgICAgICAgIDIyLjY5OTIxOSBDIDE3LjU5OTIxOSAyMi41OTkyMTkgMTcuNjk5MjE5IDIyLjQwMDM5MSAxNy42OTkyMTlcbiAgICAgICAgICAgIDIyLjQwMDM5MSBDIDIwLjI5OTIxOSAyMS43MDAzOTEgMjAuNzk5NjA5IDIwLjU5OTIxOSAyMi41OTk2MDlcbiAgICAgICAgICAgIDIwLjE5OTIxOSBDIDIzLjE5OTYwOSAyMC4wOTkyMTkgMjMuMTk5NjA5IDE5LjA5OTIxOSAyMi4wOTk2MDlcbiAgICAgICAgICAgIDE5LjE5OTIxOSBDIDIxLjI5OTYwOSAxOS4xOTkyMTkgMjAuNiAxOS42IDIwIDIwIEMgMTkgMjAuNiAxOC4zMDA3ODFcbiAgICAgICAgICAgIDIwLjY5OTYwOSAxOC4zMDA3ODEgMjAuNTk5NjA5IEMgMTguMjAwNzgxIDIwLjQ5OTYwOSAxOC42OTkyMTkgMTkuM1xuICAgICAgICAgICAgMTguMTk5MjE5IDE4IEMgMTcuNjk5MjE5IDE2LjYgMTYuODAwMzkxIDE2LjE5OTYwOSAxNi45MDAzOTFcbiAgICAgICAgICAgIDE2LjA5OTYwOSBDIDE3LjIwMDM5MSAxNS41OTk2MDkgMTcuODk5MjE5IDE0LjgwMDM5MSAxOC4xOTkyMTlcbiAgICAgICAgICAgIDEzLjQwMDM5MSBDIDE4LjI5OTIxOSAxMi41MDAzOTEgMTguMzAwMzkxIDExLjAwMDc4MSAxNy45MDAzOTFcbiAgICAgICAgICAgIDEwLjMwMDc4MSBDIDE3LjgwMDM5MSAxMC4xMDA3ODEgMTcuMTk5MjE5IDEwLjUgMTcuMTk5MjE5IDEwLjUgQ1xuICAgICAgICAgICAgMTcuMTk5MjE5IDEwLjUgMTYuNjAwMzkxIDkuMTk5NjA5NCAxNi40MDAzOTEgOS4wOTk2MDk0IEMgMTYuMzM3ODkxXG4gICAgICAgICAgICA5LjA0OTYwOTQgMTYuMjczMjQyIDkuMDMzOTg0NCAxNi4yMDg5ODQgOS4wNDQ5MjE5IHpcIiAvPlxuICAgICAgICA8L3N2Zz5cbiAgICAgICAgUG5wbVxuICAgICAgICA8c3Bhbj57cGFja2FnZXMucG5wbX08L3NwYW4+XG4gICAgICA8L2J1dHRvbj5cbiAgICB7L2lmfVxuICA8L3NlY3Rpb24+XG4gIDxzZWN0aW9uIGNsYXNzPVwic2lkZWJhckxpc3RcIj5cbiAgICA8aDEgY2xhc3M9XCJzaWRlYmFyTGlzdF9fdGl0bGVcIj5Qcm9qZWN0czwvaDE+XG4gICAgeyNpZiAkcHJvamVjdHN9XG4gICAgICB7I2VhY2ggJHByb2plY3RzIGFzIHsgaWQsIG5hbWUsIHBhdGggfX1cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIGNsYXNzOmFjdGl2ZT17JG1lbnVBY3RpdmUgPT09IGBwcm9qZWN0XyR7aWR9YH1cbiAgICAgICAgICBjbGFzcz1cInNpZGViYXJMaXN0X19pdGVtXCJcbiAgICAgICAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgbWVudUFjdGl2ZS5zZXQoYHByb2plY3RfJHtpZH1gKTtcbiAgICAgICAgICB9fT5cbiAgICAgICAgICA8c3ZnXG4gICAgICAgICAgICBjbGFzcz1cInVpX19pY29uUHJvamVjdFwiXG4gICAgICAgICAgICBzdHJva2VMaW5lY2FwPVwicm91bmRcIlxuICAgICAgICAgICAgc3Ryb2tlV2lkdGg9XCIxLjVcIlxuICAgICAgICAgICAgdmlld0JveD1cIjAgMCAyNCAyNFwiXG4gICAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgICA8cGF0aFxuICAgICAgICAgICAgICBkPVwiTTIyIDE5YTIgMiAwIDAgMS0yIDJINGEyIDIgMCAwIDEtMi0yVjVhMiAyIDAgMCAxIDItMmg1bDIgM2g5YTJcbiAgICAgICAgICAgICAgMiAwIDAgMSAyIDJ6XCIgLz5cbiAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgICB7bmFtZX1cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBjbGFzcz1cInNpZGViYXJMaXN0X19pdGVtUmVtb3ZlXCJcbiAgICAgICAgICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHByb2plY3RGaWx0ZXIgPSAkcHJvamVjdHMuZmlsdGVyKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtLmlkICE9PSBpZDtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHByb2plY3RzLnNldChwcm9qZWN0RmlsdGVyKTtcbiAgICAgICAgICAgICAgbWVudUFjdGl2ZS5zZXQobnVsbCk7XG4gICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwcm9qZWN0cycsIEpTT04uc3RyaW5naWZ5KHByb2plY3RGaWx0ZXIpKTtcbiAgICAgICAgICAgIH19PlxuICAgICAgICAgICAgJnRpbWVzO1xuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIHsvZWFjaH1cbiAgICB7L2lmfVxuICA8L3NlY3Rpb24+XG4gIDxidXR0b25cbiAgICBjbGFzcz1cImFkZFByb2plY3RcIlxuICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICBvcGVuRGlyZWN0b3J5KClcbiAgICAgICAgLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICBpZiAoIXJlc3VsdC5jYW5jZWxlZCkge1xuICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSByZXN1bHQuZmlsZVBhdGhzWzBdO1xuICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGhBcnJheSA9IHJlc3VsdC5maWxlUGF0aHNbMF0uc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGNvbnN0IHByb2plY3ROYW1lID0gcHJvamVjdFBhdGhBcnJheVtwcm9qZWN0UGF0aEFycmF5Lmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgcHJvamVjdHMuc2V0KFtcbiAgICAgICAgICAgICAgLi4uJHByb2plY3RzLFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6ICRwcm9qZWN0c1skcHJvamVjdHMubGVuZ3RoIC0gMV1cbiAgICAgICAgICAgICAgICAgID8gJHByb2plY3RzWyRwcm9qZWN0cy5sZW5ndGggLSAxXS5pZCArIDFcbiAgICAgICAgICAgICAgICAgIDogMCxcbiAgICAgICAgICAgICAgICBuYW1lOiBwcm9qZWN0TmFtZSxcbiAgICAgICAgICAgICAgICBwYXRoOiBwcm9qZWN0UGF0aFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwcm9qZWN0cycsIEpTT04uc3RyaW5naWZ5KCRwcm9qZWN0cykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfX0+XG4gICAgQWRkIFByb2plY3RcbiAgPC9idXR0b24+XG48L2FzaWRlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWVtQixRQUFRLDRCQUFDLENBQUMsQUFDM0IsVUFBVSxDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzlCLEtBQUssQ0FBRSxLQUFLLENBQ1osTUFBTSxDQUFFLEtBQUssQ0FDYixLQUFLLENBQUUsSUFBSSxDQUNYLFVBQVUsQ0FBRSxVQUFVLENBQ3RCLE9BQU8sQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDdkIsVUFBVSxDQUFFLElBQUksQ0FDaEIsa0JBQWtCLENBQUUsSUFBSSxDQUN4QixtQkFBbUIsQ0FBRSxJQUFJLENBQ3pCLFFBQVEsQ0FBRSxNQUFNLENBQ2hCLEdBQUcsQ0FBRSxDQUFDLEFBQUUsQ0FBQyxBQUVYLG1CQUFtQiw0QkFBQyxDQUFDLEFBQ25CLFNBQVMsQ0FBRSxJQUFJLENBQ2YsV0FBVyxDQUFFLEdBQUcsQ0FDaEIsY0FBYyxDQUFFLEtBQUssQ0FDckIsS0FBSyxDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQy9CLE9BQU8sQ0FB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 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i].id;
    	child_ctx[10] = list[i].name;
    	child_ctx[11] = list[i].path;
    	return child_ctx;
    }

    // (130:4) {#if packages.npm}
    function create_if_block_3(ctx) {
    	let button;
    	let svg;
    	let path;
    	let t0;
    	let span;
    	let t1_value = /*packages*/ ctx[0].npm + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = text("\n        Npm\n        ");
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M 0 10 L 0 21 L 9 21 L 9 23 L 16 23 L 16 21 L 32 21 L 32 10 L 0\n            10 z M 1.7773438 11.777344 L 8.8886719 11.777344 L 8.890625\n            11.777344 L 8.890625 19.445312 L 7.1113281 19.445312 L 7.1113281\n            13.556641 L 5.3339844 13.556641 L 5.3339844 19.445312 L 1.7773438\n            19.445312 L 1.7773438 11.777344 z M 10.667969 11.777344 L 17.777344\n            11.777344 L 17.779297 11.777344 L 17.779297 19.443359 L 14.222656\n            19.443359 L 14.222656 21.222656 L 10.667969 21.222656 L 10.667969\n            11.777344 z M 19.556641 11.777344 L 30.222656 11.777344 L 30.224609\n            11.777344 L 30.224609 19.445312 L 28.445312 19.445312 L 28.445312\n            13.556641 L 26.667969 13.556641 L 26.667969 19.445312 L 24.890625\n            19.445312 L 24.890625 13.556641 L 23.111328 13.556641 L 23.111328\n            19.445312 L 19.556641 19.445312 L 19.556641 11.777344 z M 14.222656\n            13.556641 L 14.222656 17.667969 L 16 17.667969 L 16 13.556641 L\n            14.222656 13.556641 z");
    			add_location(path, file, 140, 10, 3447);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-omlqvb");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 136, 8, 3323);
    			attr_dev(span, "class", "svelte-omlqvb");
    			add_location(span, file, 157, 8, 4538);
    			attr_dev(button, "class", "sidebarList__item svelte-omlqvb");
    			toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_1`);
    			add_location(button, file, 130, 6, 3147);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path);
    			append_dev(button, t0);
    			append_dev(button, span);
    			append_dev(span, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*packages*/ 1 && t1_value !== (t1_value = /*packages*/ ctx[0].npm + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*$menuActive*/ 2) {
    				toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_1`);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(130:4) {#if packages.npm}",
    		ctx
    	});

    	return block;
    }

    // (161:4) {#if packages.yarn}
    function create_if_block_2(ctx) {
    	let button;
    	let svg;
    	let path;
    	let t0;
    	let span;
    	let t1_value = /*packages*/ ctx[0].yarn + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = text("\n        Yarn\n        ");
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M 16 3 C 8.8 3 3 8.8 3 16 C 3 23.2 8.8 29 16 29 C 23.2 29 29 23.2\n            29 16 C 29 8.8 23.2 3 16 3 z M 16 5 C 22.1 5 27 9.9 27 16 C 27 22.1\n            22.1 27 16 27 C 9.9 27 5 22.1 5 16 C 5 9.9 9.9 5 16 5 z M 16.208984\n            9.0449219 C 15.75918 9.1214844 15.300781 10.5 15.300781 10.5 C\n            15.300781 10.5 14.099609 10.300781 13.099609 11.300781 C 12.899609\n            11.500781 12.700391 11.599219 12.400391 11.699219 C 12.300391\n            11.799219 12.2 11.800391 12 12.400391 C 11.6 13.300391 12.599609\n            14.400391 12.599609 14.400391 C 10.499609 15.900391 10.599219\n            17.900391 10.699219 18.400391 C 9.3992187 19.500391 9.8992187\n            20.900781 10.199219 21.300781 C 10.399219 21.600781 10.599219 21.5\n            10.699219 21.5 C 10.699219 21.6 10.199219 22.200391 10.699219\n            22.400391 C 11.199219 22.700391 12.000391 22.800391 12.400391\n            22.400391 C 12.700391 22.100391 12.800391 21.499219 12.900391\n            21.199219 C 13.000391 21.099219 13.000391 21.399609 13.400391\n            21.599609 C 13.400391 21.599609 12.7 21.899609 13 22.599609 C 13.1\n            22.799609 13.4 23 14 23 C 14.2 23 16.599219 22.899219 17.199219\n            22.699219 C 17.599219 22.599219 17.699219 22.400391 17.699219\n            22.400391 C 20.299219 21.700391 20.799609 20.599219 22.599609\n            20.199219 C 23.199609 20.099219 23.199609 19.099219 22.099609\n            19.199219 C 21.299609 19.199219 20.6 19.6 20 20 C 19 20.6 18.300781\n            20.699609 18.300781 20.599609 C 18.200781 20.499609 18.699219 19.3\n            18.199219 18 C 17.699219 16.6 16.800391 16.199609 16.900391\n            16.099609 C 17.200391 15.599609 17.899219 14.800391 18.199219\n            13.400391 C 18.299219 12.500391 18.300391 11.000781 17.900391\n            10.300781 C 17.800391 10.100781 17.199219 10.5 17.199219 10.5 C\n            17.199219 10.5 16.600391 9.1996094 16.400391 9.0996094 C 16.337891\n            9.0496094 16.273242 9.0339844 16.208984 9.0449219 z");
    			add_location(path, file, 171, 10, 4922);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-omlqvb");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 167, 8, 4798);
    			attr_dev(span, "class", "svelte-omlqvb");
    			add_location(span, file, 201, 8, 7012);
    			attr_dev(button, "class", "sidebarList__item svelte-omlqvb");
    			toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_2`);
    			add_location(button, file, 161, 6, 4622);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path);
    			append_dev(button, t0);
    			append_dev(button, span);
    			append_dev(span, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*packages*/ 1 && t1_value !== (t1_value = /*packages*/ ctx[0].yarn + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*$menuActive*/ 2) {
    				toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_2`);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(161:4) {#if packages.yarn}",
    		ctx
    	});

    	return block;
    }

    // (205:4) {#if packages.pnpm}
    function create_if_block_1(ctx) {
    	let button;
    	let svg;
    	let path;
    	let t0;
    	let span;
    	let t1_value = /*packages*/ ctx[0].pnpm + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = text("\n        Pnpm\n        ");
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M 16 3 C 8.8 3 3 8.8 3 16 C 3 23.2 8.8 29 16 29 C 23.2 29 29 23.2\n            29 16 C 29 8.8 23.2 3 16 3 z M 16 5 C 22.1 5 27 9.9 27 16 C 27 22.1\n            22.1 27 16 27 C 9.9 27 5 22.1 5 16 C 5 9.9 9.9 5 16 5 z M 16.208984\n            9.0449219 C 15.75918 9.1214844 15.300781 10.5 15.300781 10.5 C\n            15.300781 10.5 14.099609 10.300781 13.099609 11.300781 C 12.899609\n            11.500781 12.700391 11.599219 12.400391 11.699219 C 12.300391\n            11.799219 12.2 11.800391 12 12.400391 C 11.6 13.300391 12.599609\n            14.400391 12.599609 14.400391 C 10.499609 15.900391 10.599219\n            17.900391 10.699219 18.400391 C 9.3992187 19.500391 9.8992187\n            20.900781 10.199219 21.300781 C 10.399219 21.600781 10.599219 21.5\n            10.699219 21.5 C 10.699219 21.6 10.199219 22.200391 10.699219\n            22.400391 C 11.199219 22.700391 12.000391 22.800391 12.400391\n            22.400391 C 12.700391 22.100391 12.800391 21.499219 12.900391\n            21.199219 C 13.000391 21.099219 13.000391 21.399609 13.400391\n            21.599609 C 13.400391 21.599609 12.7 21.899609 13 22.599609 C 13.1\n            22.799609 13.4 23 14 23 C 14.2 23 16.599219 22.899219 17.199219\n            22.699219 C 17.599219 22.599219 17.699219 22.400391 17.699219\n            22.400391 C 20.299219 21.700391 20.799609 20.599219 22.599609\n            20.199219 C 23.199609 20.099219 23.199609 19.099219 22.099609\n            19.199219 C 21.299609 19.199219 20.6 19.6 20 20 C 19 20.6 18.300781\n            20.699609 18.300781 20.599609 C 18.200781 20.499609 18.699219 19.3\n            18.199219 18 C 17.699219 16.6 16.800391 16.199609 16.900391\n            16.099609 C 17.200391 15.599609 17.899219 14.800391 18.199219\n            13.400391 C 18.299219 12.500391 18.300391 11.000781 17.900391\n            10.300781 C 17.800391 10.100781 17.199219 10.5 17.199219 10.5 C\n            17.199219 10.5 16.600391 9.1996094 16.400391 9.0996094 C 16.337891\n            9.0496094 16.273242 9.0339844 16.208984 9.0449219 z");
    			add_location(path, file, 215, 10, 7397);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-omlqvb");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 211, 8, 7273);
    			attr_dev(span, "class", "svelte-omlqvb");
    			add_location(span, file, 245, 8, 9487);
    			attr_dev(button, "class", "sidebarList__item svelte-omlqvb");
    			toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_3`);
    			add_location(button, file, 205, 6, 7097);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path);
    			append_dev(button, t0);
    			append_dev(button, span);
    			append_dev(span, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*packages*/ 1 && t1_value !== (t1_value = /*packages*/ ctx[0].pnpm + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*$menuActive*/ 2) {
    				toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_3`);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(205:4) {#if packages.pnpm}",
    		ctx
    	});

    	return block;
    }

    // (252:4) {#if $projects}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*$projects*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$menuActive, $projects, menuActive, projects, localStorage, JSON*/ 6) {
    				each_value = /*$projects*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(252:4) {#if $projects}",
    		ctx
    	});

    	return block;
    }

    // (253:6) {#each $projects as { id, name, path }}
    function create_each_block(ctx) {
    	let button1;
    	let svg;
    	let path;
    	let t0;
    	let t1_value = /*name*/ ctx[10] + "";
    	let t1;
    	let t2;
    	let button0;
    	let t4;
    	let mounted;
    	let dispose;

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[6](/*id*/ ctx[9], ...args);
    	}

    	function click_handler_4(...args) {
    		return /*click_handler_4*/ ctx[7](/*id*/ ctx[9], ...args);
    	}

    	const block = {
    		c: function create() {
    			button1 = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			button0 = element("button");
    			button0.textContent = "×";
    			t4 = space();
    			attr_dev(path, "d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2\n              2 0 0 1 2 2z");
    			add_location(path, file, 265, 12, 10105);
    			attr_dev(svg, "class", "ui__iconProject svelte-omlqvb");
    			attr_dev(svg, "strokelinecap", "round");
    			attr_dev(svg, "strokewidth", "1.5");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 259, 10, 9908);
    			attr_dev(button0, "class", "sidebarList__itemRemove svelte-omlqvb");
    			add_location(button0, file, 270, 10, 10266);
    			attr_dev(button1, "class", "sidebarList__item svelte-omlqvb");
    			toggle_class(button1, "active", /*$menuActive*/ ctx[1] === `project_${/*id*/ ctx[9]}`);
    			add_location(button1, file, 253, 8, 9710);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button1, anchor);
    			append_dev(button1, svg);
    			append_dev(svg, path);
    			append_dev(button1, t0);
    			append_dev(button1, t1);
    			append_dev(button1, t2);
    			append_dev(button1, button0);
    			append_dev(button1, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_3, false, false, false),
    					listen_dev(button1, "click", click_handler_4, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*$projects*/ 4 && t1_value !== (t1_value = /*name*/ ctx[10] + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*$menuActive, $projects*/ 6) {
    				toggle_class(button1, "active", /*$menuActive*/ ctx[1] === `project_${/*id*/ ctx[9]}`);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(253:6) {#each $projects as { id, name, path }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let aside;
    	let section0;
    	let h10;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let section1;
    	let h11;
    	let t6;
    	let t7;
    	let button;
    	let mounted;
    	let dispose;
    	let if_block0 = /*packages*/ ctx[0].npm && create_if_block_3(ctx);
    	let if_block1 = /*packages*/ ctx[0].yarn && create_if_block_2(ctx);
    	let if_block2 = /*packages*/ ctx[0].pnpm && create_if_block_1(ctx);
    	let if_block3 = /*$projects*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			aside = element("aside");
    			section0 = element("section");
    			h10 = element("h1");
    			h10.textContent = "Globals";
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			if (if_block2) if_block2.c();
    			t4 = space();
    			section1 = element("section");
    			h11 = element("h1");
    			h11.textContent = "Projects";
    			t6 = space();
    			if (if_block3) if_block3.c();
    			t7 = space();
    			button = element("button");
    			button.textContent = "Add Project";
    			attr_dev(h10, "class", "sidebarList__title svelte-omlqvb");
    			add_location(h10, file, 128, 4, 3074);
    			attr_dev(section0, "class", "sidebarList svelte-omlqvb");
    			add_location(section0, file, 127, 2, 3040);
    			attr_dev(h11, "class", "sidebarList__title svelte-omlqvb");
    			add_location(h11, file, 250, 4, 9591);
    			attr_dev(section1, "class", "sidebarList svelte-omlqvb");
    			add_location(section1, file, 249, 2, 9557);
    			attr_dev(button, "class", "addProject svelte-omlqvb");
    			add_location(button, file, 286, 2, 10739);
    			attr_dev(aside, "class", "sidebar svelte-omlqvb");
    			add_location(aside, file, 126, 0, 3014);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, aside, anchor);
    			append_dev(aside, section0);
    			append_dev(section0, h10);
    			append_dev(section0, t1);
    			if (if_block0) if_block0.m(section0, null);
    			append_dev(section0, t2);
    			if (if_block1) if_block1.m(section0, null);
    			append_dev(section0, t3);
    			if (if_block2) if_block2.m(section0, null);
    			append_dev(aside, t4);
    			append_dev(aside, section1);
    			append_dev(section1, h11);
    			append_dev(section1, t6);
    			if (if_block3) if_block3.m(section1, null);
    			append_dev(aside, t7);
    			append_dev(aside, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_5*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*packages*/ ctx[0].npm) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(section0, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*packages*/ ctx[0].yarn) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(section0, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*packages*/ ctx[0].pnpm) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(section0, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*$projects*/ ctx[2]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(section1, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(aside);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $menuActive;
    	let $projects;
    	validate_store(menuActive, "menuActive");
    	component_subscribe($$self, menuActive, $$value => $$invalidate(1, $menuActive = $$value));
    	validate_store(projects, "projects");
    	component_subscribe($$self, projects, $$value => $$invalidate(2, $projects = $$value));
    	let packages = {};

    	onMount(async () => {
    		$$invalidate(0, packages = isJson
    		? JSON.parse(localStorage.getItem("packages"))
    		: {});

    		projects.set(isJson
    		? JSON.parse(localStorage.getItem("projects"))
    		: []);

    		$$invalidate(0, packages = await globalPackages().then(res => res));
    		localStorage.setItem("packages", JSON.stringify(packages));
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Sidebar", $$slots, []);

    	const click_handler = () => {
    		menuActive.set(`global_1`);
    	};

    	const click_handler_1 = () => {
    		menuActive.set(`global_2`);
    	};

    	const click_handler_2 = () => {
    		menuActive.set(`global_3`);
    	};

    	const click_handler_3 = id => {
    		const projectFilter = $projects.filter(item => {
    			return item.id !== id;
    		});

    		projects.set(projectFilter);
    		menuActive.set(null);
    		localStorage.setItem("projects", JSON.stringify(projectFilter));
    	};

    	const click_handler_4 = id => {
    		menuActive.set(`project_${id}`);
    	};

    	const click_handler_5 = () => {
    		openDirectory().then(result => {
    			if (!result.canceled) {
    				const projectPath = result.filePaths[0];
    				const projectPathArray = result.filePaths[0].split("/");
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

    				localStorage.setItem("projects", JSON.stringify($projects));
    			}
    		}).catch(err => {
    			console.log(err);
    		});
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		projects,
    		menuActive,
    		globalPackages,
    		openDirectory,
    		isJson,
    		packages,
    		$menuActive,
    		$projects
    	});

    	$$self.$inject_state = $$props => {
    		if ("packages" in $$props) $$invalidate(0, packages = $$props.packages);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		packages,
    		$menuActive,
    		$projects,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5
    	];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-omlqvb-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/components/main.svelte generated by Svelte v3.23.2 */

    const { Object: Object_1, console: console_1$1 } = globals;
    const file$1 = "src/components/main.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-12sy3sn-style";
    	style.textContent = ".content.svelte-12sy3sn.svelte-12sy3sn{background-color:#1d1d1d;width:100%;border-left:1px solid #000;padding:10px}.empty.svelte-12sy3sn.svelte-12sy3sn{text-align:center;color:#fff;font-size:15px;display:flex;justify-items:center;flex-direction:column;justify-content:center;align-items:center;height:100%}.empty.svelte-12sy3sn img.svelte-12sy3sn{width:250px;margin-bottom:15px}.empty.svelte-12sy3sn button.svelte-12sy3sn{cursor:pointer;background-color:#000;border:none;color:#fff;padding:10px;border-radius:5px;display:block}.projectTable.svelte-12sy3sn.svelte-12sy3sn{color:#fff}.projectTable.svelte-12sy3sn table.svelte-12sy3sn{width:100%;border:none;border-collapse:collapse}.projectTable.svelte-12sy3sn table thead td.svelte-12sy3sn{border:none;margin:0;padding:15px;background-color:rgba(0, 0, 0, 0.5)}.projectTable.svelte-12sy3sn table thead td.svelte-12sy3sn:first-child{border-radius:15px 0 0 0}.projectTable.svelte-12sy3sn table thead td.svelte-12sy3sn:last-child{border-radius:0 15px 0 0}.projectTable.svelte-12sy3sn table tbody tr td.svelte-12sy3sn{padding:15px;background-color:rgba(0, 0, 0, 0.2)}.projectTable.svelte-12sy3sn table tbody tr.svelte-12sy3sn:nth-child(2n){background-color:rgba(0, 0, 0, 0.21)}.projectTable.svelte-12sy3sn table tbody tr:last-child td.svelte-12sy3sn:first-child{border-radius:0 0 0 15px}.projectTable.svelte-12sy3sn table tbody tr:last-child td.svelte-12sy3sn:last-child{border-radius:0 0 15px 0}.projectTable__title.svelte-12sy3sn.svelte-12sy3sn{padding-left:15px}.skeleton.svelte-12sy3sn.svelte-12sy3sn{width:100%;background-color:rgba(255, 255, 255, 0.5);display:inline-block;height:15px;-webkit-animation:svelte-12sy3sn-change-opacity 2s linear infinite;animation:svelte-12sy3sn-change-opacity 2s linear infinite;opacity:0.3}@keyframes svelte-12sy3sn-change-opacity{0%{opacity:0.3}50%{opacity:1}100%{opacity:0.3}}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5zdmVsdGUiLCJzb3VyY2VzIjpbIm1haW4uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG5pbXBvcnQgeyBwcm9qZWN0cywgbWVudUFjdGl2ZSB9IGZyb20gXCIuLi9zdG9yZVwiO1xuaW1wb3J0IHsgb3BlbkRpcmVjdG9yeSwgZ2V0UHJvamVjdFBhY2thZ2VzIH0gZnJvbSBcIi4uL3V0aWxzL3NoZWxsLmpzXCI7XG5sZXQgY3VycmVudFByb2plY3RJRCA9IGZhbHNlO1xubGV0IGN1cnJlbnRQcm9qZWN0ID0ge307XG5sZXQgcHJvamVjdCA9IHt9O1xubGV0IHBhY2thZ2VzID0gW107XG5sZXQgZGVwZW5kZW5jaWVzID0gW107XG5sZXQgZGV2RGVwZW5kZW5jaWVzID0gW107XG5tZW51QWN0aXZlLnN1YnNjcmliZShhc3luYyB2YWx1ZSA9PiB7XG4gIGN1cnJlbnRQcm9qZWN0SUQgPSB2YWx1ZSA/IHZhbHVlLnNwbGl0KFwiX1wiKVsxXSA6IGZhbHNlO1xuICBjdXJyZW50UHJvamVjdCA9ICRwcm9qZWN0cy5maWx0ZXIoaXRlbSA9PiB7XG4gICAgcmV0dXJuIGl0ZW0uaWQgPT09IHBhcnNlSW50KGN1cnJlbnRQcm9qZWN0SUQpO1xuICB9KVswXTtcbiAgaWYgKGN1cnJlbnRQcm9qZWN0KSB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGdldFByb2plY3RQYWNrYWdlcyhjdXJyZW50UHJvamVjdC5wYXRoKS50aGVuKFxuICAgICAgcmVzID0+IHJlc1xuICAgICk7XG4gICAgcHJvamVjdCA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgZGVwZW5kZW5jaWVzID0gT2JqZWN0LmVudHJpZXMocHJvamVjdC5kZXBlbmRlbmNpZXMpO1xuICAgIGRldkRlcGVuZGVuY2llcyA9IE9iamVjdC5lbnRyaWVzKHByb2plY3QuZGV2RGVwZW5kZW5jaWVzKTtcbiAgICBsZXQgaSA9IDE7XG4gICAgZm9yIGF3YWl0IChsZXQgaXRlbSBvZiBkZXBlbmRlbmNpZXMpIHtcbiAgICAgIHBhY2thZ2VzID0gW1xuICAgICAgICAuLi5wYWNrYWdlcyxcbiAgICAgICAgeyBpZDogaSwgbmFtZTogaXRlbVswXSwgY3VycmVudDogaXRlbVsxXSwgZGV2OiBmYWxzZSB9XG4gICAgICBdO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICBmb3IgYXdhaXQgKGxldCBpdGVtIG9mIGRldkRlcGVuZGVuY2llcykge1xuICAgICAgcGFja2FnZXMgPSBbXG4gICAgICAgIC4uLnBhY2thZ2VzLFxuICAgICAgICB7IGlkOiBpLCBuYW1lOiBpdGVtWzBdLCBjdXJyZW50OiBpdGVtWzFdLCBkZXY6IHRydWUgfVxuICAgICAgXTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cbn0pO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZSBsYW5nPVwic2Nzc1wiPi5jb250ZW50IHtcbiAgYmFja2dyb3VuZC1jb2xvcjogIzFkMWQxZDtcbiAgd2lkdGg6IDEwMCU7XG4gIGJvcmRlci1sZWZ0OiAxcHggc29saWQgIzAwMDtcbiAgcGFkZGluZzogMTBweDsgfVxuXG4uZW1wdHkge1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIGNvbG9yOiAjZmZmO1xuICBmb250LXNpemU6IDE1cHg7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktaXRlbXM6IGNlbnRlcjtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGhlaWdodDogMTAwJTsgfVxuICAuZW1wdHkgaW1nIHtcbiAgICB3aWR0aDogMjUwcHg7XG4gICAgbWFyZ2luLWJvdHRvbTogMTVweDsgfVxuICAuZW1wdHkgYnV0dG9uIHtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogIzAwMDtcbiAgICBib3JkZXI6IG5vbmU7XG4gICAgY29sb3I6ICNmZmY7XG4gICAgcGFkZGluZzogMTBweDtcbiAgICBib3JkZXItcmFkaXVzOiA1cHg7XG4gICAgZGlzcGxheTogYmxvY2s7IH1cblxuLnByb2plY3RUYWJsZSB7XG4gIGNvbG9yOiAjZmZmOyB9XG4gIC5wcm9qZWN0VGFibGUgdGFibGUge1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGJvcmRlcjogbm9uZTtcbiAgICBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlOyB9XG4gICAgLnByb2plY3RUYWJsZSB0YWJsZSB0aGVhZCB0ZCB7XG4gICAgICBib3JkZXI6IG5vbmU7XG4gICAgICBtYXJnaW46IDA7XG4gICAgICBwYWRkaW5nOiAxNXB4O1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjUpOyB9XG4gICAgICAucHJvamVjdFRhYmxlIHRhYmxlIHRoZWFkIHRkOmZpcnN0LWNoaWxkIHtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogMTVweCAwIDAgMDsgfVxuICAgICAgLnByb2plY3RUYWJsZSB0YWJsZSB0aGVhZCB0ZDpsYXN0LWNoaWxkIHtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogMCAxNXB4IDAgMDsgfVxuICAgIC5wcm9qZWN0VGFibGUgdGFibGUgdGJvZHkgdHIgdGQge1xuICAgICAgcGFkZGluZzogMTVweDtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC4yKTsgfVxuICAgIC5wcm9qZWN0VGFibGUgdGFibGUgdGJvZHkgdHI6bnRoLWNoaWxkKDJuKSB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMjEpOyB9XG4gICAgLnByb2plY3RUYWJsZSB0YWJsZSB0Ym9keSB0cjpsYXN0LWNoaWxkIHRkOmZpcnN0LWNoaWxkIHtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDAgMCAwIDE1cHg7IH1cbiAgICAucHJvamVjdFRhYmxlIHRhYmxlIHRib2R5IHRyOmxhc3QtY2hpbGQgdGQ6bGFzdC1jaGlsZCB7XG4gICAgICBib3JkZXItcmFkaXVzOiAwIDAgMTVweCAwOyB9XG5cbi5wcm9qZWN0VGFibGVfX3RpdGxlIHtcbiAgcGFkZGluZy1sZWZ0OiAxNXB4OyB9XG5cbi5za2VsZXRvbiB7XG4gIHdpZHRoOiAxMDAlO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNSk7XG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgaGVpZ2h0OiAxNXB4O1xuICAtd2Via2l0LWFuaW1hdGlvbjogY2hhbmdlLW9wYWNpdHkgMnMgbGluZWFyIGluZmluaXRlO1xuICBhbmltYXRpb246IGNoYW5nZS1vcGFjaXR5IDJzIGxpbmVhciBpbmZpbml0ZTtcbiAgb3BhY2l0eTogMC4zOyB9XG5cbkBrZXlmcmFtZXMgY2hhbmdlLW9wYWNpdHkge1xuICAwJSB7XG4gICAgb3BhY2l0eTogMC4zOyB9XG4gIDUwJSB7XG4gICAgb3BhY2l0eTogMTsgfVxuICAxMDAlIHtcbiAgICBvcGFjaXR5OiAwLjM7IH0gfVxuPC9zdHlsZT5cblxuPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgeyNpZiAhY3VycmVudFByb2plY3R9XG4gICAgPHNlY3Rpb24gY2xhc3M9XCJlbXB0eVwiPlxuICAgICAgPGltZyBzcmM9XCIuL2ltYWdlcy9hZGQucG5nXCIgd2lkdGg9XCIzMDBcIiBhbHQ9XCJcIiAvPlxuICAgICAgPGgxPlNlbGVjdCBQcm9qZWN0IHRvIHN0YXJ0PC9oMT5cbiAgICAgIDxidXR0b25cbiAgICAgICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgICAgICBvcGVuRGlyZWN0b3J5KClcbiAgICAgICAgICAgIC50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgIGlmICghcmVzdWx0LmNhbmNlbGVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSByZXN1bHQuZmlsZVBhdGhzWzBdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2plY3RQYXRoQXJyYXkgPSByZXN1bHQuZmlsZVBhdGhzWzBdLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdE5hbWUgPSBwcm9qZWN0UGF0aEFycmF5W3Byb2plY3RQYXRoQXJyYXkubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgcHJvamVjdHMuc2V0KFtcbiAgICAgICAgICAgICAgICAgIC4uLiRwcm9qZWN0cyxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICRwcm9qZWN0c1skcHJvamVjdHMubGVuZ3RoIC0gMV1cbiAgICAgICAgICAgICAgICAgICAgICA/ICRwcm9qZWN0c1skcHJvamVjdHMubGVuZ3RoIC0gMV0uaWQgKyAxXG4gICAgICAgICAgICAgICAgICAgICAgOiAwLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBwcm9qZWN0TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvamVjdFBhdGhcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncHJvamVjdHMnLCBKU09OLnN0cmluZ2lmeSgkcHJvamVjdHMpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH19PlxuICAgICAgICBBZGQgUHJvamVjdFxuICAgICAgPC9idXR0b24+XG4gICAgPC9zZWN0aW9uPlxuICB7OmVsc2V9XG4gICAgPHNlY3Rpb24gY2xhc3M9XCJwcm9qZWN0VGFibGVcIj5cbiAgICAgIDxoMSBjbGFzcz1cInByb2plY3RUYWJsZV9fdGl0bGVcIj57Y3VycmVudFByb2plY3QubmFtZX08L2gxPlxuICAgICAgPHRhYmxlPlxuICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAgPHRkPlBhY2thZ2U8L3RkPlxuICAgICAgICAgICAgPHRkPkN1cnJlbnQ8L3RkPlxuICAgICAgICAgICAgPHRkPldhbnRlZDwvdGQ+XG4gICAgICAgICAgICA8dGQ+TGF0ZXN0PC90ZD5cbiAgICAgICAgICAgIDx0ZD5lbnY8L3RkPlxuICAgICAgICAgIDwvdHI+XG4gICAgICAgIDwvdGhlYWQ+XG4gICAgICAgIDx0Ym9keT5cbiAgICAgICAgICB7I2lmIHBhY2thZ2VzfVxuICAgICAgICAgICAgeyNlYWNoIHBhY2thZ2VzIGFzIHsgaWQsIG5hbWUsIGN1cnJlbnQsIGRldiB9fVxuICAgICAgICAgICAgICA8dHIgaWQ9e2BwYWNrYWdlXyR7aWR9YH0+XG4gICAgICAgICAgICAgICAgPHRkPntuYW1lfTwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPntjdXJyZW50fTwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJza2VsZXRvblwiIC8+XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInNrZWxldG9uXCIgLz5cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgIHsjaWYgZGV2fWRldnsvaWZ9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIHsvZWFjaH1cbiAgICAgICAgICB7L2lmfVxuICAgICAgICA8L3Rib2R5PlxuICAgICAgPC90YWJsZT5cbiAgICA8L3NlY3Rpb24+XG4gIHsvaWZ9XG48L2Rpdj5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF3Q21CLFFBQVEsOEJBQUMsQ0FBQyxBQUMzQixnQkFBZ0IsQ0FBRSxPQUFPLENBQ3pCLEtBQUssQ0FBRSxJQUFJLENBQ1gsV0FBVyxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUMzQixPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFbEIsTUFBTSw4QkFBQyxDQUFDLEFBQ04sVUFBVSxDQUFFLE1BQU0sQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxTQUFTLENBQUUsSUFBSSxDQUNmLE9BQU8sQ0FBRSxJQUFJLENBQ2IsYUFBYSxDQUFFLE1BQU0sQ0FDckIsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsZUFBZSxDQUFFLE1BQU0sQ0FDdkIsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsTUFBTSxDQUFFLElBQUksQUFBRSxDQUFDLEFBQ2YscUJBQU0sQ0FBQyxHQUFHLGVBQUMsQ0FBQyxBQUNWLEtBQUssQ0FBRSxLQUFLLENBQ1osYUFBYSxDQUFFLElBQUksQUFBRSxDQUFDLEFBQ3hCLHFCQUFNLENBQUMsTUFBTSxlQUFDLENBQUMsQUFDYixNQUFNLENBQUUsT0FBTyxDQUNmLGdCQUFnQixDQUFFLElBQUksQ0FDdEIsTUFBTSxDQUFFLElBQUksQ0FDWixLQUFLLENBQUUsSUFBSSxDQUNYLE9BQU8sQ0FBRSxJQUFJLENBQ2IsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsT0FBTyxDQUFFLEtBQUssQUFBRSxDQUFDLEFBRXJCLGFBQWEsOEJBQUMsQ0FBQyxBQUNiLEtBQUssQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNkLDRCQUFhLENBQUMsS0FBSyxlQUFDLENBQUMsQUFDbkIsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLGVBQWUsQ0FBRSxRQUFRLEFBQUUsQ0FBQyxBQUM1Qiw0QkFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxlQUFDLENBQUMsQUFDNUIsTUFBTSxDQUFFLElBQUksQ0FDWixNQUFNLENBQUUsQ0FBQyxDQUNULE9BQU8sQ0FBRSxJQUFJLENBQ2IsZ0JBQWdCLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFBRSxDQUFDLEFBQ3ZDLDRCQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxpQkFBRSxZQUFZLEFBQUMsQ0FBQyxBQUN4QyxhQUFhLENBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFFLENBQUMsQUFDOUIsNEJBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGlCQUFFLFdBQVcsQUFBQyxDQUFDLEFBQ3ZDLGFBQWEsQ0FBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUUsQ0FBQyxBQUNoQyw0QkFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsZUFBQyxDQUFDLEFBQy9CLE9BQU8sQ0FBRSxJQUFJLENBQ2IsZ0JBQWdCLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFBRSxDQUFDLEFBQ3pDLDRCQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxpQkFBRSxXQUFXLEVBQUUsQ0FBQyxBQUFDLENBQUMsQUFDMUMsZ0JBQWdCLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQUFBRSxDQUFDLEFBQzFDLDRCQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLFdBQVcsQ0FBQyxpQkFBRSxZQUFZLEFBQUMsQ0FBQyxBQUN0RCxhQUFhLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFDOUIsNEJBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsV0FBVyxDQUFDLGlCQUFFLFdBQVcsQUFBQyxDQUFDLEFBQ3JELGFBQWEsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEFBQUUsQ0FBQyxBQUVsQyxvQkFBb0IsOEJBQUMsQ0FBQyxBQUNwQixZQUFZLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFdkIsU0FBUyw4QkFBQyxDQUFDLEFBQ1QsS0FBSyxDQUFFLElBQUksQ0FDWCxnQkFBZ0IsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUMxQyxPQUFPLENBQUUsWUFBWSxDQUNyQixNQUFNLENBQUUsSUFBSSxDQUNaLGlCQUFpQixDQUFFLDZCQUFjLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQ3BELFNBQVMsQ0FBRSw2QkFBYyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUM1QyxPQUFPLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFakIsV0FBVyw2QkFBZSxDQUFDLEFBQ3pCLEVBQUUsQUFBQyxDQUFDLEFBQ0YsT0FBTyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBQ2pCLEdBQUcsQUFBQyxDQUFDLEFBQ0gsT0FBTyxDQUFFLENBQUMsQUFBRSxDQUFDLEFBQ2YsSUFBSSxBQUFDLENBQUMsQUFDSixPQUFPLENBQUUsR0FBRyxBQUFFLENBQUMsQUFBQyxDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i].id;
    	child_ctx[9] = list[i].name;
    	child_ctx[10] = list[i].current;
    	child_ctx[11] = list[i].dev;
    	return child_ctx;
    }

    // (148:2) {:else}
    function create_else_block(ctx) {
    	let section;
    	let h1;
    	let t0_value = /*currentProject*/ ctx[0].name + "";
    	let t0;
    	let t1;
    	let table;
    	let thead;
    	let tr;
    	let td0;
    	let t3;
    	let td1;
    	let t5;
    	let td2;
    	let t7;
    	let td3;
    	let t9;
    	let td4;
    	let t11;
    	let tbody;
    	let if_block = /*packages*/ ctx[1] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			td0 = element("td");
    			td0.textContent = "Package";
    			t3 = space();
    			td1 = element("td");
    			td1.textContent = "Current";
    			t5 = space();
    			td2 = element("td");
    			td2.textContent = "Wanted";
    			t7 = space();
    			td3 = element("td");
    			td3.textContent = "Latest";
    			t9 = space();
    			td4 = element("td");
    			td4.textContent = "env";
    			t11 = space();
    			tbody = element("tbody");
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "projectTable__title svelte-12sy3sn");
    			add_location(h1, file$1, 149, 6, 4070);
    			attr_dev(td0, "class", "svelte-12sy3sn");
    			add_location(td0, file$1, 153, 12, 4186);
    			attr_dev(td1, "class", "svelte-12sy3sn");
    			add_location(td1, file$1, 154, 12, 4215);
    			attr_dev(td2, "class", "svelte-12sy3sn");
    			add_location(td2, file$1, 155, 12, 4244);
    			attr_dev(td3, "class", "svelte-12sy3sn");
    			add_location(td3, file$1, 156, 12, 4272);
    			attr_dev(td4, "class", "svelte-12sy3sn");
    			add_location(td4, file$1, 157, 12, 4300);
    			attr_dev(tr, "class", "svelte-12sy3sn");
    			add_location(tr, file$1, 152, 10, 4169);
    			add_location(thead, file$1, 151, 8, 4151);
    			add_location(tbody, file$1, 160, 8, 4354);
    			attr_dev(table, "class", "svelte-12sy3sn");
    			add_location(table, file$1, 150, 6, 4135);
    			attr_dev(section, "class", "projectTable svelte-12sy3sn");
    			add_location(section, file$1, 148, 4, 4033);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h1);
    			append_dev(h1, t0);
    			append_dev(section, t1);
    			append_dev(section, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, td0);
    			append_dev(tr, t3);
    			append_dev(tr, td1);
    			append_dev(tr, t5);
    			append_dev(tr, td2);
    			append_dev(tr, t7);
    			append_dev(tr, td3);
    			append_dev(tr, t9);
    			append_dev(tr, td4);
    			append_dev(table, t11);
    			append_dev(table, tbody);
    			if (if_block) if_block.m(tbody, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentProject*/ 1 && t0_value !== (t0_value = /*currentProject*/ ctx[0].name + "")) set_data_dev(t0, t0_value);

    			if (/*packages*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(tbody, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(148:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (116:2) {#if !currentProject}
    function create_if_block$1(ctx) {
    	let section;
    	let img;
    	let img_src_value;
    	let t0;
    	let h1;
    	let t2;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			img = element("img");
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "Select Project to start";
    			t2 = space();
    			button = element("button");
    			button.textContent = "Add Project";
    			if (img.src !== (img_src_value = "./images/add.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "300");
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-12sy3sn");
    			add_location(img, file$1, 117, 6, 2990);
    			add_location(h1, file$1, 118, 6, 3046);
    			attr_dev(button, "class", "svelte-12sy3sn");
    			add_location(button, file$1, 119, 6, 3085);
    			attr_dev(section, "class", "empty svelte-12sy3sn");
    			add_location(section, file$1, 116, 4, 2960);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, img);
    			append_dev(section, t0);
    			append_dev(section, h1);
    			append_dev(section, t2);
    			append_dev(section, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(116:2) {#if !currentProject}",
    		ctx
    	});

    	return block;
    }

    // (162:10) {#if packages}
    function create_if_block_1$1(ctx) {
    	let each_1_anchor;
    	let each_value = /*packages*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*packages*/ 2) {
    				each_value = /*packages*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(162:10) {#if packages}",
    		ctx
    	});

    	return block;
    }

    // (174:18) {#if dev}
    function create_if_block_2$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("dev");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(174:18) {#if dev}",
    		ctx
    	});

    	return block;
    }

    // (163:12) {#each packages as { id, name, current, dev }}
    function create_each_block$1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*name*/ ctx[9] + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*current*/ ctx[10] + "";
    	let t2;
    	let t3;
    	let td2;
    	let span0;
    	let t4;
    	let td3;
    	let span1;
    	let t5;
    	let td4;
    	let t6;
    	let tr_id_value;
    	let if_block = /*dev*/ ctx[11] && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			span0 = element("span");
    			t4 = space();
    			td3 = element("td");
    			span1 = element("span");
    			t5 = space();
    			td4 = element("td");
    			if (if_block) if_block.c();
    			t6 = space();
    			attr_dev(td0, "class", "svelte-12sy3sn");
    			add_location(td0, file$1, 164, 16, 4502);
    			attr_dev(td1, "class", "svelte-12sy3sn");
    			add_location(td1, file$1, 165, 16, 4534);
    			attr_dev(span0, "class", "skeleton svelte-12sy3sn");
    			add_location(span0, file$1, 167, 18, 4592);
    			attr_dev(td2, "class", "svelte-12sy3sn");
    			add_location(td2, file$1, 166, 16, 4569);
    			attr_dev(span1, "class", "skeleton svelte-12sy3sn");
    			add_location(span1, file$1, 170, 18, 4679);
    			attr_dev(td3, "class", "svelte-12sy3sn");
    			add_location(td3, file$1, 169, 16, 4656);
    			attr_dev(td4, "class", "svelte-12sy3sn");
    			add_location(td4, file$1, 172, 16, 4743);
    			attr_dev(tr, "id", tr_id_value = `package_${/*id*/ ctx[8]}`);
    			attr_dev(tr, "class", "svelte-12sy3sn");
    			add_location(tr, file$1, 163, 14, 4460);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, span0);
    			append_dev(tr, t4);
    			append_dev(tr, td3);
    			append_dev(td3, span1);
    			append_dev(tr, t5);
    			append_dev(tr, td4);
    			if (if_block) if_block.m(td4, null);
    			append_dev(tr, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*packages*/ 2 && t0_value !== (t0_value = /*name*/ ctx[9] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*packages*/ 2 && t2_value !== (t2_value = /*current*/ ctx[10] + "")) set_data_dev(t2, t2_value);

    			if (/*dev*/ ctx[11]) {
    				if (if_block) ; else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					if_block.m(td4, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*packages*/ 2 && tr_id_value !== (tr_id_value = `package_${/*id*/ ctx[8]}`)) {
    				attr_dev(tr, "id", tr_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(163:12) {#each packages as { id, name, current, dev }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (!/*currentProject*/ ctx[0]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "content svelte-12sy3sn");
    			add_location(div, file$1, 114, 0, 2910);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $projects;
    	validate_store(projects, "projects");
    	component_subscribe($$self, projects, $$value => $$invalidate(2, $projects = $$value));
    	let currentProjectID = false;
    	let currentProject = {};
    	let project = {};
    	let packages = [];
    	let dependencies = [];
    	let devDependencies = [];

    	menuActive.subscribe(async value => {
    		currentProjectID = value ? value.split("_")[1] : false;

    		$$invalidate(0, currentProject = $projects.filter(item => {
    			return item.id === parseInt(currentProjectID);
    		})[0]);

    		if (currentProject) {
    			const data = await getProjectPackages(currentProject.path).then(res => res);
    			project = JSON.parse(data);
    			dependencies = Object.entries(project.dependencies);
    			devDependencies = Object.entries(project.devDependencies);
    			let i = 1;

    			for await (let item of dependencies) {
    				$$invalidate(1, packages = [
    					...packages,
    					{
    						id: i,
    						name: item[0],
    						current: item[1],
    						dev: false
    					}
    				]);

    				i++;
    			}

    			for await (let item of devDependencies) {
    				$$invalidate(1, packages = [
    					...packages,
    					{
    						id: i,
    						name: item[0],
    						current: item[1],
    						dev: true
    					}
    				]);

    				i++;
    			}
    		}
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Main", $$slots, []);

    	const click_handler = () => {
    		openDirectory().then(result => {
    			if (!result.canceled) {
    				const projectPath = result.filePaths[0];
    				const projectPathArray = result.filePaths[0].split("/");
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

    				localStorage.setItem("projects", JSON.stringify($projects));
    			}
    		}).catch(err => {
    			console.log(err);
    		});
    	};

    	$$self.$capture_state = () => ({
    		projects,
    		menuActive,
    		openDirectory,
    		getProjectPackages,
    		currentProjectID,
    		currentProject,
    		project,
    		packages,
    		dependencies,
    		devDependencies,
    		$projects
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentProjectID" in $$props) currentProjectID = $$props.currentProjectID;
    		if ("currentProject" in $$props) $$invalidate(0, currentProject = $$props.currentProject);
    		if ("project" in $$props) project = $$props.project;
    		if ("packages" in $$props) $$invalidate(1, packages = $$props.packages);
    		if ("dependencies" in $$props) dependencies = $$props.dependencies;
    		if ("devDependencies" in $$props) devDependencies = $$props.devDependencies;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentProject, packages, $projects, click_handler];
    }

    class Main extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-12sy3sn-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.23.2 */
    const file$2 = "src/App.svelte";

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-7w27wa-style";
    	style.textContent = ".main.svelte-7w27wa{min-height:100vh;height:100%;display:flex;flex-direction:row;align-items:stretch}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuaW1wb3J0IFNpZGViYXIgZnJvbSBcIi4vY29tcG9uZW50cy9zaWRlYmFyLnN2ZWx0ZVwiO1xuaW1wb3J0IE1haW4gZnJvbSBcIi4vY29tcG9uZW50cy9tYWluLnN2ZWx0ZVwiO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+Lm1haW4ge1xuICBtaW4taGVpZ2h0OiAxMDB2aDtcbiAgaGVpZ2h0OiAxMDAlO1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93O1xuICBhbGlnbi1pdGVtczogc3RyZXRjaDsgfVxuPC9zdHlsZT5cblxuPG1haW4gY2xhc3M9XCJtYWluXCI+XG4gIDxTaWRlYmFyIC8+XG4gIDxNYWluIC8+XG48L21haW4+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS3dCLEtBQUssY0FBQyxDQUFDLEFBQzdCLFVBQVUsQ0FBRSxLQUFLLENBQ2pCLE1BQU0sQ0FBRSxJQUFJLENBQ1osT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxDQUNuQixXQUFXLENBQUUsT0FBTyxBQUFFLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    function create_fragment$2(ctx) {
    	let main1;
    	let sidebar;
    	let t;
    	let main0;
    	let current;
    	sidebar = new Sidebar({ $$inline: true });
    	main0 = new Main({ $$inline: true });

    	const block = {
    		c: function create() {
    			main1 = element("main");
    			create_component(sidebar.$$.fragment);
    			t = space();
    			create_component(main0.$$.fragment);
    			attr_dev(main1, "class", "main svelte-7w27wa");
    			add_location(main1, file$2, 13, 0, 261);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main1, anchor);
    			mount_component(sidebar, main1, null);
    			append_dev(main1, t);
    			mount_component(main0, main1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sidebar.$$.fragment, local);
    			transition_in(main0.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sidebar.$$.fragment, local);
    			transition_out(main0.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main1);
    			destroy_component(sidebar);
    			destroy_component(main0);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ Sidebar, Main });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-7w27wa-style")) add_css$2();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
