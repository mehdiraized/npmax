
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

    const util = require("util");
    const { dialog } = require("electron").remote;
    const exec = util.promisify(require("child_process").exec);

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
    	style.id = "svelte-16vh9mg-style";
    	style.textContent = ".sidebar.svelte-16vh9mg.svelte-16vh9mg{background:rgba(0, 0, 0, 0.1);width:250px;height:100%;color:#fff;box-sizing:border-box;padding:50px 15px;overflow-x:auto;-webkit-app-region:drag;-webkit-user-select:none}.sidebarList__title.svelte-16vh9mg.svelte-16vh9mg{font-size:11px;font-weight:500;letter-spacing:0.5px;color:rgba(255, 255, 255, 0.2);display:block}.sidebarList.svelte-16vh9mg.svelte-16vh9mg{margin-bottom:15px}.sidebarList__item.svelte-16vh9mg.svelte-16vh9mg{text-align:left;width:100%;border:none;color:#fff;padding:7px 15px;background-color:transparent;border-radius:7px;font-size:14px;display:block;height:30px;line-height:normal;transition:all 0.3s ease-in-out}.sidebarList__item.svelte-16vh9mg span.svelte-16vh9mg{float:right;background-color:rgba(255, 255, 255, 0.1);color:#fff;padding:1px 5px 0;border-radius:50px;font-size:12px;transition:all 0.3s ease-in-out}.sidebarList__item.svelte-16vh9mg:hover .ui__iconGlobal.svelte-16vh9mg{fill:red}.sidebarList__item.svelte-16vh9mg:hover .ui__iconProject.svelte-16vh9mg{fill:#fff}.sidebarList__item.active.svelte-16vh9mg.svelte-16vh9mg{background-color:rgba(255, 255, 255, 0.1)}.sidebarList__item.active.svelte-16vh9mg span.svelte-16vh9mg{background-color:rgba(255, 255, 255, 0.2)}.sidebarList__item.active.svelte-16vh9mg .sidebarList__itemRemove.svelte-16vh9mg{opacity:1}.sidebarList__item.active.svelte-16vh9mg .ui__iconGlobal.svelte-16vh9mg{fill:red}.sidebarList__item.active.svelte-16vh9mg .ui__iconProject.svelte-16vh9mg{fill:#fff}.sidebarList__itemRemove.svelte-16vh9mg.svelte-16vh9mg{opacity:0;transition:all 0.3s ease-in-out;float:right;background-color:rgba(255, 255, 255, 0.1);width:20px;height:20px;border-radius:20px;border:none;line-height:14px;font-size:16px;color:#fff;margin-top:-2px;text-align:center;padding:0px 1px 0px 0px}.sidebarList__itemRemove.svelte-16vh9mg.svelte-16vh9mg:hover{color:red}.ui__iconProject.svelte-16vh9mg.svelte-16vh9mg{width:18px;margin-right:15px;float:left;line-height:0;margin-top:-1px;stroke:#fff;transition:all 0.3s ease-in-out;fill:transparent}.ui__iconGlobal.svelte-16vh9mg.svelte-16vh9mg{width:25px;margin-right:15px;float:left;line-height:0;margin-top:-5px;transition:all 0.3s ease-in-out;fill:#fff}.addProject.svelte-16vh9mg.svelte-16vh9mg{width:100%;border:none;cursor:pointer;background-color:rgba(0, 0, 0, 0.3);color:#fff;padding:10px;border-radius:5px;display:block}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhci5zdmVsdGUiLCJzb3VyY2VzIjpbInNpZGViYXIuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG5pbXBvcnQgeyBvbk1vdW50IH0gZnJvbSBcInN2ZWx0ZVwiO1xuaW1wb3J0IHsgcHJvamVjdHMsIG1lbnVBY3RpdmUgfSBmcm9tIFwiLi4vc3RvcmVcIjtcbmltcG9ydCB7IGdsb2JhbFBhY2thZ2VzLCBvcGVuRGlyZWN0b3J5IH0gZnJvbSBcIi4uL3V0aWxzL3NoZWxsLmpzXCI7XG5pbXBvcnQgeyBpc0pzb24gfSBmcm9tIFwiLi4vdXRpbHMvaW5kZXguanNcIjtcblxubGV0IHBhY2thZ2VzID0ge307XG5vbk1vdW50KGFzeW5jICgpID0+IHtcbiAgcGFja2FnZXMgPSBpc0pzb24gPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicGFja2FnZXNcIikpIDoge307XG4gIHByb2plY3RzLnNldChpc0pzb24gPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicHJvamVjdHNcIikpIDogW10pO1xuICBwYWNrYWdlcyA9IGF3YWl0IGdsb2JhbFBhY2thZ2VzKCkudGhlbihyZXMgPT4gcmVzKTtcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJwYWNrYWdlc1wiLCBKU09OLnN0cmluZ2lmeShwYWNrYWdlcykpO1xufSk7XG48L3NjcmlwdD5cblxuPHN0eWxlIGxhbmc9XCJzY3NzXCI+LnNpZGViYXIge1xuICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuMSk7XG4gIHdpZHRoOiAyNTBweDtcbiAgaGVpZ2h0OiAxMDAlO1xuICBjb2xvcjogI2ZmZjtcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgcGFkZGluZzogNTBweCAxNXB4O1xuICBvdmVyZmxvdy14OiBhdXRvO1xuICAtd2Via2l0LWFwcC1yZWdpb246IGRyYWc7XG4gIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7IH1cblxuLnNpZGViYXJMaXN0X190aXRsZSB7XG4gIGZvbnQtc2l6ZTogMTFweDtcbiAgZm9udC13ZWlnaHQ6IDUwMDtcbiAgbGV0dGVyLXNwYWNpbmc6IDAuNXB4O1xuICBjb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpO1xuICBkaXNwbGF5OiBibG9jazsgfVxuXG4uc2lkZWJhckxpc3Qge1xuICBtYXJnaW4tYm90dG9tOiAxNXB4OyB9XG5cbi5zaWRlYmFyTGlzdF9faXRlbSB7XG4gIHRleHQtYWxpZ246IGxlZnQ7XG4gIHdpZHRoOiAxMDAlO1xuICBib3JkZXI6IG5vbmU7XG4gIGNvbG9yOiAjZmZmO1xuICBwYWRkaW5nOiA3cHggMTVweDtcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XG4gIGJvcmRlci1yYWRpdXM6IDdweDtcbiAgZm9udC1zaXplOiAxNHB4O1xuICBkaXNwbGF5OiBibG9jaztcbiAgaGVpZ2h0OiAzMHB4O1xuICBsaW5lLWhlaWdodDogbm9ybWFsO1xuICB0cmFuc2l0aW9uOiBhbGwgMC4zcyBlYXNlLWluLW91dDsgfVxuICAuc2lkZWJhckxpc3RfX2l0ZW0gc3BhbiB7XG4gICAgZmxvYXQ6IHJpZ2h0O1xuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKTtcbiAgICBjb2xvcjogI2ZmZjtcbiAgICBwYWRkaW5nOiAxcHggNXB4IDA7XG4gICAgYm9yZGVyLXJhZGl1czogNTBweDtcbiAgICBmb250LXNpemU6IDEycHg7XG4gICAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7IH1cbiAgLnNpZGViYXJMaXN0X19pdGVtOmhvdmVyIC51aV9faWNvbkdsb2JhbCB7XG4gICAgZmlsbDogcmVkOyB9XG4gIC5zaWRlYmFyTGlzdF9faXRlbTpob3ZlciAudWlfX2ljb25Qcm9qZWN0IHtcbiAgICBmaWxsOiAjZmZmOyB9XG4gIC5zaWRlYmFyTGlzdF9faXRlbS5hY3RpdmUge1xuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKTsgfVxuICAgIC5zaWRlYmFyTGlzdF9faXRlbS5hY3RpdmUgc3BhbiB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMik7IH1cbiAgICAuc2lkZWJhckxpc3RfX2l0ZW0uYWN0aXZlIC5zaWRlYmFyTGlzdF9faXRlbVJlbW92ZSB7XG4gICAgICBvcGFjaXR5OiAxOyB9XG4gICAgLnNpZGViYXJMaXN0X19pdGVtLmFjdGl2ZSAudWlfX2ljb25HbG9iYWwge1xuICAgICAgZmlsbDogcmVkOyB9XG4gICAgLnNpZGViYXJMaXN0X19pdGVtLmFjdGl2ZSAudWlfX2ljb25Qcm9qZWN0IHtcbiAgICAgIGZpbGw6ICNmZmY7IH1cblxuLnNpZGViYXJMaXN0X19pdGVtUmVtb3ZlIHtcbiAgb3BhY2l0eTogMDtcbiAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7XG4gIGZsb2F0OiByaWdodDtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpO1xuICB3aWR0aDogMjBweDtcbiAgaGVpZ2h0OiAyMHB4O1xuICBib3JkZXItcmFkaXVzOiAyMHB4O1xuICBib3JkZXI6IG5vbmU7XG4gIGxpbmUtaGVpZ2h0OiAxNHB4O1xuICBmb250LXNpemU6IDE2cHg7XG4gIGNvbG9yOiAjZmZmO1xuICBtYXJnaW4tdG9wOiAtMnB4O1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIHBhZGRpbmc6IDBweCAxcHggMHB4IDBweDsgfVxuICAuc2lkZWJhckxpc3RfX2l0ZW1SZW1vdmU6aG92ZXIge1xuICAgIGNvbG9yOiByZWQ7IH1cblxuLnVpX19pY29uUHJvamVjdCB7XG4gIHdpZHRoOiAxOHB4O1xuICBtYXJnaW4tcmlnaHQ6IDE1cHg7XG4gIGZsb2F0OiBsZWZ0O1xuICBsaW5lLWhlaWdodDogMDtcbiAgbWFyZ2luLXRvcDogLTFweDtcbiAgc3Ryb2tlOiAjZmZmO1xuICB0cmFuc2l0aW9uOiBhbGwgMC4zcyBlYXNlLWluLW91dDtcbiAgZmlsbDogdHJhbnNwYXJlbnQ7IH1cblxuLnVpX19pY29uR2xvYmFsIHtcbiAgd2lkdGg6IDI1cHg7XG4gIG1hcmdpbi1yaWdodDogMTVweDtcbiAgZmxvYXQ6IGxlZnQ7XG4gIGxpbmUtaGVpZ2h0OiAwO1xuICBtYXJnaW4tdG9wOiAtNXB4O1xuICB0cmFuc2l0aW9uOiBhbGwgMC4zcyBlYXNlLWluLW91dDtcbiAgZmlsbDogI2ZmZjsgfVxuXG4uYWRkUHJvamVjdCB7XG4gIHdpZHRoOiAxMDAlO1xuICBib3JkZXI6IG5vbmU7XG4gIGN1cnNvcjogcG9pbnRlcjtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjMpO1xuICBjb2xvcjogI2ZmZjtcbiAgcGFkZGluZzogMTBweDtcbiAgYm9yZGVyLXJhZGl1czogNXB4O1xuICBkaXNwbGF5OiBibG9jazsgfVxuPC9zdHlsZT5cblxuPGFzaWRlIGNsYXNzPVwic2lkZWJhclwiPlxuICA8c2VjdGlvbiBjbGFzcz1cInNpZGViYXJMaXN0XCI+XG4gICAgPGgxIGNsYXNzPVwic2lkZWJhckxpc3RfX3RpdGxlXCI+R2xvYmFsczwvaDE+XG4gICAgeyNpZiBwYWNrYWdlcy5ucG19XG4gICAgICA8YnV0dG9uXG4gICAgICAgIGNsYXNzOmFjdGl2ZT17JG1lbnVBY3RpdmUgPT09IGBnbG9iYWxfMWB9XG4gICAgICAgIGNsYXNzPVwic2lkZWJhckxpc3RfX2l0ZW1cIlxuICAgICAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgIG1lbnVBY3RpdmUuc2V0KGBnbG9iYWxfMWApO1xuICAgICAgICB9fT5cbiAgICAgICAgPHN2Z1xuICAgICAgICAgIGNsYXNzPVwidWlfX2ljb25HbG9iYWxcIlxuICAgICAgICAgIHZpZXdCb3g9XCIwIDAgMzIgMzJcIlxuICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICA8cGF0aFxuICAgICAgICAgICAgZD1cIk0gMCAxMCBMIDAgMjEgTCA5IDIxIEwgOSAyMyBMIDE2IDIzIEwgMTYgMjEgTCAzMiAyMSBMIDMyIDEwIEwgMFxuICAgICAgICAgICAgMTAgeiBNIDEuNzc3MzQzOCAxMS43NzczNDQgTCA4Ljg4ODY3MTkgMTEuNzc3MzQ0IEwgOC44OTA2MjVcbiAgICAgICAgICAgIDExLjc3NzM0NCBMIDguODkwNjI1IDE5LjQ0NTMxMiBMIDcuMTExMzI4MSAxOS40NDUzMTIgTCA3LjExMTMyODFcbiAgICAgICAgICAgIDEzLjU1NjY0MSBMIDUuMzMzOTg0NCAxMy41NTY2NDEgTCA1LjMzMzk4NDQgMTkuNDQ1MzEyIEwgMS43NzczNDM4XG4gICAgICAgICAgICAxOS40NDUzMTIgTCAxLjc3NzM0MzggMTEuNzc3MzQ0IHogTSAxMC42Njc5NjkgMTEuNzc3MzQ0IEwgMTcuNzc3MzQ0XG4gICAgICAgICAgICAxMS43NzczNDQgTCAxNy43NzkyOTcgMTEuNzc3MzQ0IEwgMTcuNzc5Mjk3IDE5LjQ0MzM1OSBMIDE0LjIyMjY1NlxuICAgICAgICAgICAgMTkuNDQzMzU5IEwgMTQuMjIyNjU2IDIxLjIyMjY1NiBMIDEwLjY2Nzk2OSAyMS4yMjI2NTYgTCAxMC42Njc5NjlcbiAgICAgICAgICAgIDExLjc3NzM0NCB6IE0gMTkuNTU2NjQxIDExLjc3NzM0NCBMIDMwLjIyMjY1NiAxMS43NzczNDQgTCAzMC4yMjQ2MDlcbiAgICAgICAgICAgIDExLjc3NzM0NCBMIDMwLjIyNDYwOSAxOS40NDUzMTIgTCAyOC40NDUzMTIgMTkuNDQ1MzEyIEwgMjguNDQ1MzEyXG4gICAgICAgICAgICAxMy41NTY2NDEgTCAyNi42Njc5NjkgMTMuNTU2NjQxIEwgMjYuNjY3OTY5IDE5LjQ0NTMxMiBMIDI0Ljg5MDYyNVxuICAgICAgICAgICAgMTkuNDQ1MzEyIEwgMjQuODkwNjI1IDEzLjU1NjY0MSBMIDIzLjExMTMyOCAxMy41NTY2NDEgTCAyMy4xMTEzMjhcbiAgICAgICAgICAgIDE5LjQ0NTMxMiBMIDE5LjU1NjY0MSAxOS40NDUzMTIgTCAxOS41NTY2NDEgMTEuNzc3MzQ0IHogTSAxNC4yMjI2NTZcbiAgICAgICAgICAgIDEzLjU1NjY0MSBMIDE0LjIyMjY1NiAxNy42Njc5NjkgTCAxNiAxNy42Njc5NjkgTCAxNiAxMy41NTY2NDEgTFxuICAgICAgICAgICAgMTQuMjIyNjU2IDEzLjU1NjY0MSB6XCIgLz5cbiAgICAgICAgPC9zdmc+XG4gICAgICAgIE5wbVxuICAgICAgICA8c3Bhbj57cGFja2FnZXMubnBtfTwvc3Bhbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgIHsvaWZ9XG4gICAgeyNpZiBwYWNrYWdlcy55YXJufVxuICAgICAgPGJ1dHRvblxuICAgICAgICBjbGFzczphY3RpdmU9eyRtZW51QWN0aXZlID09PSBgZ2xvYmFsXzJgfVxuICAgICAgICBjbGFzcz1cInNpZGViYXJMaXN0X19pdGVtXCJcbiAgICAgICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgICAgICBtZW51QWN0aXZlLnNldChgZ2xvYmFsXzJgKTtcbiAgICAgICAgfX0+XG4gICAgICAgIDxzdmdcbiAgICAgICAgICBjbGFzcz1cInVpX19pY29uR2xvYmFsXCJcbiAgICAgICAgICB2aWV3Qm94PVwiMCAwIDMyIDMyXCJcbiAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgIGQ9XCJNIDE2IDMgQyA4LjggMyAzIDguOCAzIDE2IEMgMyAyMy4yIDguOCAyOSAxNiAyOSBDIDIzLjIgMjkgMjkgMjMuMlxuICAgICAgICAgICAgMjkgMTYgQyAyOSA4LjggMjMuMiAzIDE2IDMgeiBNIDE2IDUgQyAyMi4xIDUgMjcgOS45IDI3IDE2IEMgMjcgMjIuMVxuICAgICAgICAgICAgMjIuMSAyNyAxNiAyNyBDIDkuOSAyNyA1IDIyLjEgNSAxNiBDIDUgOS45IDkuOSA1IDE2IDUgeiBNIDE2LjIwODk4NFxuICAgICAgICAgICAgOS4wNDQ5MjE5IEMgMTUuNzU5MTggOS4xMjE0ODQ0IDE1LjMwMDc4MSAxMC41IDE1LjMwMDc4MSAxMC41IENcbiAgICAgICAgICAgIDE1LjMwMDc4MSAxMC41IDE0LjA5OTYwOSAxMC4zMDA3ODEgMTMuMDk5NjA5IDExLjMwMDc4MSBDIDEyLjg5OTYwOVxuICAgICAgICAgICAgMTEuNTAwNzgxIDEyLjcwMDM5MSAxMS41OTkyMTkgMTIuNDAwMzkxIDExLjY5OTIxOSBDIDEyLjMwMDM5MVxuICAgICAgICAgICAgMTEuNzk5MjE5IDEyLjIgMTEuODAwMzkxIDEyIDEyLjQwMDM5MSBDIDExLjYgMTMuMzAwMzkxIDEyLjU5OTYwOVxuICAgICAgICAgICAgMTQuNDAwMzkxIDEyLjU5OTYwOSAxNC40MDAzOTEgQyAxMC40OTk2MDkgMTUuOTAwMzkxIDEwLjU5OTIxOVxuICAgICAgICAgICAgMTcuOTAwMzkxIDEwLjY5OTIxOSAxOC40MDAzOTEgQyA5LjM5OTIxODcgMTkuNTAwMzkxIDkuODk5MjE4N1xuICAgICAgICAgICAgMjAuOTAwNzgxIDEwLjE5OTIxOSAyMS4zMDA3ODEgQyAxMC4zOTkyMTkgMjEuNjAwNzgxIDEwLjU5OTIxOSAyMS41XG4gICAgICAgICAgICAxMC42OTkyMTkgMjEuNSBDIDEwLjY5OTIxOSAyMS42IDEwLjE5OTIxOSAyMi4yMDAzOTEgMTAuNjk5MjE5XG4gICAgICAgICAgICAyMi40MDAzOTEgQyAxMS4xOTkyMTkgMjIuNzAwMzkxIDEyLjAwMDM5MSAyMi44MDAzOTEgMTIuNDAwMzkxXG4gICAgICAgICAgICAyMi40MDAzOTEgQyAxMi43MDAzOTEgMjIuMTAwMzkxIDEyLjgwMDM5MSAyMS40OTkyMTkgMTIuOTAwMzkxXG4gICAgICAgICAgICAyMS4xOTkyMTkgQyAxMy4wMDAzOTEgMjEuMDk5MjE5IDEzLjAwMDM5MSAyMS4zOTk2MDkgMTMuNDAwMzkxXG4gICAgICAgICAgICAyMS41OTk2MDkgQyAxMy40MDAzOTEgMjEuNTk5NjA5IDEyLjcgMjEuODk5NjA5IDEzIDIyLjU5OTYwOSBDIDEzLjFcbiAgICAgICAgICAgIDIyLjc5OTYwOSAxMy40IDIzIDE0IDIzIEMgMTQuMiAyMyAxNi41OTkyMTkgMjIuODk5MjE5IDE3LjE5OTIxOVxuICAgICAgICAgICAgMjIuNjk5MjE5IEMgMTcuNTk5MjE5IDIyLjU5OTIxOSAxNy42OTkyMTkgMjIuNDAwMzkxIDE3LjY5OTIxOVxuICAgICAgICAgICAgMjIuNDAwMzkxIEMgMjAuMjk5MjE5IDIxLjcwMDM5MSAyMC43OTk2MDkgMjAuNTk5MjE5IDIyLjU5OTYwOVxuICAgICAgICAgICAgMjAuMTk5MjE5IEMgMjMuMTk5NjA5IDIwLjA5OTIxOSAyMy4xOTk2MDkgMTkuMDk5MjE5IDIyLjA5OTYwOVxuICAgICAgICAgICAgMTkuMTk5MjE5IEMgMjEuMjk5NjA5IDE5LjE5OTIxOSAyMC42IDE5LjYgMjAgMjAgQyAxOSAyMC42IDE4LjMwMDc4MVxuICAgICAgICAgICAgMjAuNjk5NjA5IDE4LjMwMDc4MSAyMC41OTk2MDkgQyAxOC4yMDA3ODEgMjAuNDk5NjA5IDE4LjY5OTIxOSAxOS4zXG4gICAgICAgICAgICAxOC4xOTkyMTkgMTggQyAxNy42OTkyMTkgMTYuNiAxNi44MDAzOTEgMTYuMTk5NjA5IDE2LjkwMDM5MVxuICAgICAgICAgICAgMTYuMDk5NjA5IEMgMTcuMjAwMzkxIDE1LjU5OTYwOSAxNy44OTkyMTkgMTQuODAwMzkxIDE4LjE5OTIxOVxuICAgICAgICAgICAgMTMuNDAwMzkxIEMgMTguMjk5MjE5IDEyLjUwMDM5MSAxOC4zMDAzOTEgMTEuMDAwNzgxIDE3LjkwMDM5MVxuICAgICAgICAgICAgMTAuMzAwNzgxIEMgMTcuODAwMzkxIDEwLjEwMDc4MSAxNy4xOTkyMTkgMTAuNSAxNy4xOTkyMTkgMTAuNSBDXG4gICAgICAgICAgICAxNy4xOTkyMTkgMTAuNSAxNi42MDAzOTEgOS4xOTk2MDk0IDE2LjQwMDM5MSA5LjA5OTYwOTQgQyAxNi4zMzc4OTFcbiAgICAgICAgICAgIDkuMDQ5NjA5NCAxNi4yNzMyNDIgOS4wMzM5ODQ0IDE2LjIwODk4NCA5LjA0NDkyMTkgelwiIC8+XG4gICAgICAgIDwvc3ZnPlxuICAgICAgICBZYXJuXG4gICAgICAgIDxzcGFuPntwYWNrYWdlcy55YXJufTwvc3Bhbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgIHsvaWZ9XG4gICAgeyNpZiBwYWNrYWdlcy5wbnBtfVxuICAgICAgPGJ1dHRvblxuICAgICAgICBjbGFzczphY3RpdmU9eyRtZW51QWN0aXZlID09PSBgZ2xvYmFsXzNgfVxuICAgICAgICBjbGFzcz1cInNpZGViYXJMaXN0X19pdGVtXCJcbiAgICAgICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgICAgICBtZW51QWN0aXZlLnNldChgZ2xvYmFsXzNgKTtcbiAgICAgICAgfX0+XG4gICAgICAgIDxzdmdcbiAgICAgICAgICBjbGFzcz1cInVpX19pY29uR2xvYmFsXCJcbiAgICAgICAgICB2aWV3Qm94PVwiMCAwIDMyIDMyXCJcbiAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgIGQ9XCJNIDE2IDMgQyA4LjggMyAzIDguOCAzIDE2IEMgMyAyMy4yIDguOCAyOSAxNiAyOSBDIDIzLjIgMjkgMjkgMjMuMlxuICAgICAgICAgICAgMjkgMTYgQyAyOSA4LjggMjMuMiAzIDE2IDMgeiBNIDE2IDUgQyAyMi4xIDUgMjcgOS45IDI3IDE2IEMgMjcgMjIuMVxuICAgICAgICAgICAgMjIuMSAyNyAxNiAyNyBDIDkuOSAyNyA1IDIyLjEgNSAxNiBDIDUgOS45IDkuOSA1IDE2IDUgeiBNIDE2LjIwODk4NFxuICAgICAgICAgICAgOS4wNDQ5MjE5IEMgMTUuNzU5MTggOS4xMjE0ODQ0IDE1LjMwMDc4MSAxMC41IDE1LjMwMDc4MSAxMC41IENcbiAgICAgICAgICAgIDE1LjMwMDc4MSAxMC41IDE0LjA5OTYwOSAxMC4zMDA3ODEgMTMuMDk5NjA5IDExLjMwMDc4MSBDIDEyLjg5OTYwOVxuICAgICAgICAgICAgMTEuNTAwNzgxIDEyLjcwMDM5MSAxMS41OTkyMTkgMTIuNDAwMzkxIDExLjY5OTIxOSBDIDEyLjMwMDM5MVxuICAgICAgICAgICAgMTEuNzk5MjE5IDEyLjIgMTEuODAwMzkxIDEyIDEyLjQwMDM5MSBDIDExLjYgMTMuMzAwMzkxIDEyLjU5OTYwOVxuICAgICAgICAgICAgMTQuNDAwMzkxIDEyLjU5OTYwOSAxNC40MDAzOTEgQyAxMC40OTk2MDkgMTUuOTAwMzkxIDEwLjU5OTIxOVxuICAgICAgICAgICAgMTcuOTAwMzkxIDEwLjY5OTIxOSAxOC40MDAzOTEgQyA5LjM5OTIxODcgMTkuNTAwMzkxIDkuODk5MjE4N1xuICAgICAgICAgICAgMjAuOTAwNzgxIDEwLjE5OTIxOSAyMS4zMDA3ODEgQyAxMC4zOTkyMTkgMjEuNjAwNzgxIDEwLjU5OTIxOSAyMS41XG4gICAgICAgICAgICAxMC42OTkyMTkgMjEuNSBDIDEwLjY5OTIxOSAyMS42IDEwLjE5OTIxOSAyMi4yMDAzOTEgMTAuNjk5MjE5XG4gICAgICAgICAgICAyMi40MDAzOTEgQyAxMS4xOTkyMTkgMjIuNzAwMzkxIDEyLjAwMDM5MSAyMi44MDAzOTEgMTIuNDAwMzkxXG4gICAgICAgICAgICAyMi40MDAzOTEgQyAxMi43MDAzOTEgMjIuMTAwMzkxIDEyLjgwMDM5MSAyMS40OTkyMTkgMTIuOTAwMzkxXG4gICAgICAgICAgICAyMS4xOTkyMTkgQyAxMy4wMDAzOTEgMjEuMDk5MjE5IDEzLjAwMDM5MSAyMS4zOTk2MDkgMTMuNDAwMzkxXG4gICAgICAgICAgICAyMS41OTk2MDkgQyAxMy40MDAzOTEgMjEuNTk5NjA5IDEyLjcgMjEuODk5NjA5IDEzIDIyLjU5OTYwOSBDIDEzLjFcbiAgICAgICAgICAgIDIyLjc5OTYwOSAxMy40IDIzIDE0IDIzIEMgMTQuMiAyMyAxNi41OTkyMTkgMjIuODk5MjE5IDE3LjE5OTIxOVxuICAgICAgICAgICAgMjIuNjk5MjE5IEMgMTcuNTk5MjE5IDIyLjU5OTIxOSAxNy42OTkyMTkgMjIuNDAwMzkxIDE3LjY5OTIxOVxuICAgICAgICAgICAgMjIuNDAwMzkxIEMgMjAuMjk5MjE5IDIxLjcwMDM5MSAyMC43OTk2MDkgMjAuNTk5MjE5IDIyLjU5OTYwOVxuICAgICAgICAgICAgMjAuMTk5MjE5IEMgMjMuMTk5NjA5IDIwLjA5OTIxOSAyMy4xOTk2MDkgMTkuMDk5MjE5IDIyLjA5OTYwOVxuICAgICAgICAgICAgMTkuMTk5MjE5IEMgMjEuMjk5NjA5IDE5LjE5OTIxOSAyMC42IDE5LjYgMjAgMjAgQyAxOSAyMC42IDE4LjMwMDc4MVxuICAgICAgICAgICAgMjAuNjk5NjA5IDE4LjMwMDc4MSAyMC41OTk2MDkgQyAxOC4yMDA3ODEgMjAuNDk5NjA5IDE4LjY5OTIxOSAxOS4zXG4gICAgICAgICAgICAxOC4xOTkyMTkgMTggQyAxNy42OTkyMTkgMTYuNiAxNi44MDAzOTEgMTYuMTk5NjA5IDE2LjkwMDM5MVxuICAgICAgICAgICAgMTYuMDk5NjA5IEMgMTcuMjAwMzkxIDE1LjU5OTYwOSAxNy44OTkyMTkgMTQuODAwMzkxIDE4LjE5OTIxOVxuICAgICAgICAgICAgMTMuNDAwMzkxIEMgMTguMjk5MjE5IDEyLjUwMDM5MSAxOC4zMDAzOTEgMTEuMDAwNzgxIDE3LjkwMDM5MVxuICAgICAgICAgICAgMTAuMzAwNzgxIEMgMTcuODAwMzkxIDEwLjEwMDc4MSAxNy4xOTkyMTkgMTAuNSAxNy4xOTkyMTkgMTAuNSBDXG4gICAgICAgICAgICAxNy4xOTkyMTkgMTAuNSAxNi42MDAzOTEgOS4xOTk2MDk0IDE2LjQwMDM5MSA5LjA5OTYwOTQgQyAxNi4zMzc4OTFcbiAgICAgICAgICAgIDkuMDQ5NjA5NCAxNi4yNzMyNDIgOS4wMzM5ODQ0IDE2LjIwODk4NCA5LjA0NDkyMTkgelwiIC8+XG4gICAgICAgIDwvc3ZnPlxuICAgICAgICBQbnBtXG4gICAgICAgIDxzcGFuPntwYWNrYWdlcy5wbnBtfTwvc3Bhbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgIHsvaWZ9XG4gIDwvc2VjdGlvbj5cbiAgPHNlY3Rpb24gY2xhc3M9XCJzaWRlYmFyTGlzdFwiPlxuICAgIDxoMSBjbGFzcz1cInNpZGViYXJMaXN0X190aXRsZVwiPlByb2plY3RzPC9oMT5cbiAgICB7I2lmICRwcm9qZWN0c31cbiAgICAgIHsjZWFjaCAkcHJvamVjdHMgYXMgeyBpZCwgbmFtZSwgcGF0aCB9fVxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgY2xhc3M6YWN0aXZlPXskbWVudUFjdGl2ZSA9PT0gYHByb2plY3RfJHtpZH1gfVxuICAgICAgICAgIGNsYXNzPVwic2lkZWJhckxpc3RfX2l0ZW1cIlxuICAgICAgICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICBtZW51QWN0aXZlLnNldChgcHJvamVjdF8ke2lkfWApO1xuICAgICAgICAgIH19PlxuICAgICAgICAgIDxzdmdcbiAgICAgICAgICAgIGNsYXNzPVwidWlfX2ljb25Qcm9qZWN0XCJcbiAgICAgICAgICAgIHN0cm9rZUxpbmVjYXA9XCJyb3VuZFwiXG4gICAgICAgICAgICBzdHJva2VXaWR0aD1cIjEuNVwiXG4gICAgICAgICAgICB2aWV3Qm94PVwiMCAwIDI0IDI0XCJcbiAgICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICAgIGQ9XCJNMjIgMTlhMiAyIDAgMCAxLTIgMkg0YTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDVsMiAzaDlhMlxuICAgICAgICAgICAgICAyIDAgMCAxIDIgMnpcIiAvPlxuICAgICAgICAgIDwvc3ZnPlxuICAgICAgICAgIHtuYW1lfVxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIGNsYXNzPVwic2lkZWJhckxpc3RfX2l0ZW1SZW1vdmVcIlxuICAgICAgICAgICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgcHJvamVjdEZpbHRlciA9ICRwcm9qZWN0cy5maWx0ZXIoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0uaWQgIT09IGlkO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcHJvamVjdHMuc2V0KHByb2plY3RGaWx0ZXIpO1xuICAgICAgICAgICAgICBtZW51QWN0aXZlLnNldChudWxsKTtcbiAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Byb2plY3RzJywgSlNPTi5zdHJpbmdpZnkocHJvamVjdEZpbHRlcikpO1xuICAgICAgICAgICAgfX0+XG4gICAgICAgICAgICAmdGltZXM7XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgey9lYWNofVxuICAgIHsvaWZ9XG4gIDwvc2VjdGlvbj5cbiAgPGJ1dHRvblxuICAgIGNsYXNzPVwiYWRkUHJvamVjdFwiXG4gICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgIG9wZW5EaXJlY3RvcnkoKVxuICAgICAgICAudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgIGlmICghcmVzdWx0LmNhbmNlbGVkKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IHJlc3VsdC5maWxlUGF0aHNbMF07XG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aEFycmF5ID0gcmVzdWx0LmZpbGVQYXRoc1swXS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgY29uc3QgcHJvamVjdE5hbWUgPSBwcm9qZWN0UGF0aEFycmF5W3Byb2plY3RQYXRoQXJyYXkubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBwcm9qZWN0cy5zZXQoW1xuICAgICAgICAgICAgICAuLi4kcHJvamVjdHMsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogJHByb2plY3RzWyRwcm9qZWN0cy5sZW5ndGggLSAxXVxuICAgICAgICAgICAgICAgICAgPyAkcHJvamVjdHNbJHByb2plY3RzLmxlbmd0aCAtIDFdLmlkICsgMVxuICAgICAgICAgICAgICAgICAgOiAwLFxuICAgICAgICAgICAgICAgIG5hbWU6IHByb2plY3ROYW1lLFxuICAgICAgICAgICAgICAgIHBhdGg6IHByb2plY3RQYXRoXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Byb2plY3RzJywgSlNPTi5zdHJpbmdpZnkoJHByb2plY3RzKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9KTtcbiAgICB9fT5cbiAgICBBZGQgUHJvamVjdFxuICA8L2J1dHRvbj5cbjwvYXNpZGU+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZW1CLFFBQVEsOEJBQUMsQ0FBQyxBQUMzQixVQUFVLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDOUIsS0FBSyxDQUFFLEtBQUssQ0FDWixNQUFNLENBQUUsSUFBSSxDQUNaLEtBQUssQ0FBRSxJQUFJLENBQ1gsVUFBVSxDQUFFLFVBQVUsQ0FDdEIsT0FBTyxDQUFFLElBQUksQ0FBQyxJQUFJLENBQ2xCLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLGtCQUFrQixDQUFFLElBQUksQ0FDeEIsbUJBQW1CLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFOUIsbUJBQW1CLDhCQUFDLENBQUMsQUFDbkIsU0FBUyxDQUFFLElBQUksQ0FDZixXQUFXLENBQUUsR0FBRyxDQUNoQixjQUFjLENBQUUsS0FBSyxDQUNyQixLQUFLLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDL0IsT0FBTyxDQUFFLEtBQUssQUFBRSxDQUFDLEFBRW5CLFlBQVksOEJBQUMsQ0FBQyxBQUNaLGFBQWEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUV4QixrQkFBa0IsOEJBQUMsQ0FBQyxBQUNsQixVQUFVLENBQUUsSUFBSSxDQUNoQixLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxJQUFJLENBQ1osS0FBSyxDQUFFLElBQUksQ0FDWCxPQUFPLENBQUUsR0FBRyxDQUFDLElBQUksQ0FDakIsZ0JBQWdCLENBQUUsV0FBVyxDQUM3QixhQUFhLENBQUUsR0FBRyxDQUNsQixTQUFTLENBQUUsSUFBSSxDQUNmLE9BQU8sQ0FBRSxLQUFLLENBQ2QsTUFBTSxDQUFFLElBQUksQ0FDWixXQUFXLENBQUUsTUFBTSxDQUNuQixVQUFVLENBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEFBQUUsQ0FBQyxBQUNuQyxpQ0FBa0IsQ0FBQyxJQUFJLGVBQUMsQ0FBQyxBQUN2QixLQUFLLENBQUUsS0FBSyxDQUNaLGdCQUFnQixDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzFDLEtBQUssQ0FBRSxJQUFJLENBQ1gsT0FBTyxDQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUNsQixhQUFhLENBQUUsSUFBSSxDQUNuQixTQUFTLENBQUUsSUFBSSxDQUNmLFVBQVUsQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQUFBRSxDQUFDLEFBQ3JDLGlDQUFrQixNQUFNLENBQUMsZUFBZSxlQUFDLENBQUMsQUFDeEMsSUFBSSxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBQ2QsaUNBQWtCLE1BQU0sQ0FBQyxnQkFBZ0IsZUFBQyxDQUFDLEFBQ3pDLElBQUksQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNmLGtCQUFrQixPQUFPLDhCQUFDLENBQUMsQUFDekIsZ0JBQWdCLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFBRSxDQUFDLEFBQzdDLGtCQUFrQixzQkFBTyxDQUFDLElBQUksZUFBQyxDQUFDLEFBQzlCLGdCQUFnQixDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUUsQ0FBQyxBQUMvQyxrQkFBa0Isc0JBQU8sQ0FBQyx3QkFBd0IsZUFBQyxDQUFDLEFBQ2xELE9BQU8sQ0FBRSxDQUFDLEFBQUUsQ0FBQyxBQUNmLGtCQUFrQixzQkFBTyxDQUFDLGVBQWUsZUFBQyxDQUFDLEFBQ3pDLElBQUksQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUNkLGtCQUFrQixzQkFBTyxDQUFDLGdCQUFnQixlQUFDLENBQUMsQUFDMUMsSUFBSSxDQUFFLElBQUksQUFBRSxDQUFDLEFBRW5CLHdCQUF3Qiw4QkFBQyxDQUFDLEFBQ3hCLE9BQU8sQ0FBRSxDQUFDLENBQ1YsVUFBVSxDQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUNoQyxLQUFLLENBQUUsS0FBSyxDQUNaLGdCQUFnQixDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzFDLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixhQUFhLENBQUUsSUFBSSxDQUNuQixNQUFNLENBQUUsSUFBSSxDQUNaLFdBQVcsQ0FBRSxJQUFJLENBQ2pCLFNBQVMsQ0FBRSxJQUFJLENBQ2YsS0FBSyxDQUFFLElBQUksQ0FDWCxVQUFVLENBQUUsSUFBSSxDQUNoQixVQUFVLENBQUUsTUFBTSxDQUNsQixPQUFPLENBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxBQUFFLENBQUMsQUFDM0Isc0RBQXdCLE1BQU0sQUFBQyxDQUFDLEFBQzlCLEtBQUssQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUVqQixnQkFBZ0IsOEJBQUMsQ0FBQyxBQUNoQixLQUFLLENBQUUsSUFBSSxDQUNYLFlBQVksQ0FBRSxJQUFJLENBQ2xCLEtBQUssQ0FBRSxJQUFJLENBQ1gsV0FBVyxDQUFFLENBQUMsQ0FDZCxVQUFVLENBQUUsSUFBSSxDQUNoQixNQUFNLENBQUUsSUFBSSxDQUNaLFVBQVUsQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDaEMsSUFBSSxDQUFFLFdBQVcsQUFBRSxDQUFDLEFBRXRCLGVBQWUsOEJBQUMsQ0FBQyxBQUNmLEtBQUssQ0FBRSxJQUFJLENBQ1gsWUFBWSxDQUFFLElBQUksQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxXQUFXLENBQUUsQ0FBQyxDQUNkLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLFVBQVUsQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDaEMsSUFBSSxDQUFFLElBQUksQUFBRSxDQUFDLEFBRWYsV0FBVyw4QkFBQyxDQUFDLEFBQ1gsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLE1BQU0sQ0FBRSxPQUFPLENBQ2YsZ0JBQWdCLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDcEMsS0FBSyxDQUFFLElBQUksQ0FDWCxPQUFPLENBQUUsSUFBSSxDQUNiLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLE9BQU8sQ0FBRSxLQUFLLEFBQUUsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i].id;
    	child_ctx[10] = list[i].name;
    	child_ctx[11] = list[i].path;
    	return child_ctx;
    }

    // (124:4) {#if packages.npm}
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
    			add_location(path, file, 134, 10, 3311);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-16vh9mg");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 130, 8, 3187);
    			attr_dev(span, "class", "svelte-16vh9mg");
    			add_location(span, file, 151, 8, 4402);
    			attr_dev(button, "class", "sidebarList__item svelte-16vh9mg");
    			toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_1`);
    			add_location(button, file, 124, 6, 3011);
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
    		source: "(124:4) {#if packages.npm}",
    		ctx
    	});

    	return block;
    }

    // (155:4) {#if packages.yarn}
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
    			add_location(path, file, 165, 10, 4786);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-16vh9mg");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 161, 8, 4662);
    			attr_dev(span, "class", "svelte-16vh9mg");
    			add_location(span, file, 195, 8, 6876);
    			attr_dev(button, "class", "sidebarList__item svelte-16vh9mg");
    			toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_2`);
    			add_location(button, file, 155, 6, 4486);
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
    		source: "(155:4) {#if packages.yarn}",
    		ctx
    	});

    	return block;
    }

    // (199:4) {#if packages.pnpm}
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
    			add_location(path, file, 209, 10, 7261);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-16vh9mg");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 205, 8, 7137);
    			attr_dev(span, "class", "svelte-16vh9mg");
    			add_location(span, file, 239, 8, 9351);
    			attr_dev(button, "class", "sidebarList__item svelte-16vh9mg");
    			toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_3`);
    			add_location(button, file, 199, 6, 6961);
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
    		source: "(199:4) {#if packages.pnpm}",
    		ctx
    	});

    	return block;
    }

    // (246:4) {#if $projects}
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
    		source: "(246:4) {#if $projects}",
    		ctx
    	});

    	return block;
    }

    // (247:6) {#each $projects as { id, name, path }}
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
    			add_location(path, file, 259, 12, 9969);
    			attr_dev(svg, "class", "ui__iconProject svelte-16vh9mg");
    			attr_dev(svg, "strokelinecap", "round");
    			attr_dev(svg, "strokewidth", "1.5");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 253, 10, 9772);
    			attr_dev(button0, "class", "sidebarList__itemRemove svelte-16vh9mg");
    			add_location(button0, file, 264, 10, 10130);
    			attr_dev(button1, "class", "sidebarList__item svelte-16vh9mg");
    			toggle_class(button1, "active", /*$menuActive*/ ctx[1] === `project_${/*id*/ ctx[9]}`);
    			add_location(button1, file, 247, 8, 9574);
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
    		source: "(247:6) {#each $projects as { id, name, path }}",
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
    			attr_dev(h10, "class", "sidebarList__title svelte-16vh9mg");
    			add_location(h10, file, 122, 4, 2938);
    			attr_dev(section0, "class", "sidebarList svelte-16vh9mg");
    			add_location(section0, file, 121, 2, 2904);
    			attr_dev(h11, "class", "sidebarList__title svelte-16vh9mg");
    			add_location(h11, file, 244, 4, 9455);
    			attr_dev(section1, "class", "sidebarList svelte-16vh9mg");
    			add_location(section1, file, 243, 2, 9421);
    			attr_dev(button, "class", "addProject svelte-16vh9mg");
    			add_location(button, file, 280, 2, 10603);
    			attr_dev(aside, "class", "sidebar svelte-16vh9mg");
    			add_location(aside, file, 120, 0, 2878);
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
    		if (!document.getElementById("svelte-16vh9mg-style")) add_css();
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

    const { console: console_1$1 } = globals;
    const file$1 = "src/components/main.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1nrx24v-style";
    	style.textContent = ".content.svelte-1nrx24v.svelte-1nrx24v{background-color:#1d1d1d;width:100%;border-left:1px solid #000;padding:10px}.empty.svelte-1nrx24v.svelte-1nrx24v{text-align:center;color:#fff;font-size:15px;display:flex;justify-items:center;flex-direction:column;justify-content:center;align-items:center;height:100%}.empty.svelte-1nrx24v img.svelte-1nrx24v{width:250px;margin-bottom:15px}.empty.svelte-1nrx24v button.svelte-1nrx24v{cursor:pointer;background-color:#000;border:none;color:#fff;padding:10px;border-radius:5px;display:block}.projectTable.svelte-1nrx24v.svelte-1nrx24v{color:#fff}.projectTable.svelte-1nrx24v table.svelte-1nrx24v{width:100%;border:none}.projectTable.svelte-1nrx24v table thead td.svelte-1nrx24v{border:none;margin:0;background-color:#000}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5zdmVsdGUiLCJzb3VyY2VzIjpbIm1haW4uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG5pbXBvcnQgeyBwcm9qZWN0cywgbWVudUFjdGl2ZSB9IGZyb20gXCIuLi9zdG9yZVwiO1xuaW1wb3J0IHsgb3BlbkRpcmVjdG9yeSB9IGZyb20gXCIuLi91dGlscy9zaGVsbC5qc1wiO1xubGV0IGN1cnJlbnRQcm9qZWN0SUQgPSBmYWxzZTtcbmxldCBjdXJyZW50UHJvamVjdCA9IHt9O1xubWVudUFjdGl2ZS5zdWJzY3JpYmUodmFsdWUgPT4ge1xuICBjdXJyZW50UHJvamVjdElEID0gdmFsdWUgPyB2YWx1ZS5zcGxpdChcIl9cIilbMV0gOiBmYWxzZTtcbiAgY3VycmVudFByb2plY3QgPSAkcHJvamVjdHMuZmlsdGVyKGl0ZW0gPT4ge1xuICAgIHJldHVybiBpdGVtLmlkID09PSBwYXJzZUludChjdXJyZW50UHJvamVjdElEKTtcbiAgfSlbMF07XG59KTtcbjwvc2NyaXB0PlxuXG48c3R5bGUgbGFuZz1cInNjc3NcIj4uY29udGVudCB7XG4gIGJhY2tncm91bmQtY29sb3I6ICMxZDFkMWQ7XG4gIHdpZHRoOiAxMDAlO1xuICBib3JkZXItbGVmdDogMXB4IHNvbGlkICMwMDA7XG4gIHBhZGRpbmc6IDEwcHg7IH1cblxuLmVtcHR5IHtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xuICBjb2xvcjogI2ZmZjtcbiAgZm9udC1zaXplOiAxNXB4O1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWl0ZW1zOiBjZW50ZXI7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBoZWlnaHQ6IDEwMCU7IH1cbiAgLmVtcHR5IGltZyB7XG4gICAgd2lkdGg6IDI1MHB4O1xuICAgIG1hcmdpbi1ib3R0b206IDE1cHg7IH1cbiAgLmVtcHR5IGJ1dHRvbiB7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIGJhY2tncm91bmQtY29sb3I6ICMwMDA7XG4gICAgYm9yZGVyOiBub25lO1xuICAgIGNvbG9yOiAjZmZmO1xuICAgIHBhZGRpbmc6IDEwcHg7XG4gICAgYm9yZGVyLXJhZGl1czogNXB4O1xuICAgIGRpc3BsYXk6IGJsb2NrOyB9XG5cbi5wcm9qZWN0VGFibGUge1xuICBjb2xvcjogI2ZmZjsgfVxuICAucHJvamVjdFRhYmxlIHRhYmxlIHtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBib3JkZXI6IG5vbmU7IH1cbiAgICAucHJvamVjdFRhYmxlIHRhYmxlIHRoZWFkIHRkIHtcbiAgICAgIGJvcmRlcjogbm9uZTtcbiAgICAgIG1hcmdpbjogMDtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6ICMwMDA7IH1cbjwvc3R5bGU+XG5cbjxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gIHsjaWYgIWN1cnJlbnRQcm9qZWN0fVxuICAgIDxzZWN0aW9uIGNsYXNzPVwiZW1wdHlcIj5cbiAgICAgIDxpbWcgc3JjPVwiLi9pbWFnZXMvYWRkLnBuZ1wiIHdpZHRoPVwiMzAwXCIgYWx0PVwiXCIgLz5cbiAgICAgIDxoMT5TZWxlY3QgUHJvamVjdCB0byBzdGFydDwvaDE+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgb3BlbkRpcmVjdG9yeSgpXG4gICAgICAgICAgICAudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5jYW5jZWxlZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2plY3RQYXRoID0gcmVzdWx0LmZpbGVQYXRoc1swXTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aEFycmF5ID0gcmVzdWx0LmZpbGVQYXRoc1swXS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2plY3ROYW1lID0gcHJvamVjdFBhdGhBcnJheVtwcm9qZWN0UGF0aEFycmF5Lmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIHByb2plY3RzLnNldChbXG4gICAgICAgICAgICAgICAgICAuLi4kcHJvamVjdHMsXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAkcHJvamVjdHNbJHByb2plY3RzLmxlbmd0aCAtIDFdXG4gICAgICAgICAgICAgICAgICAgICAgPyAkcHJvamVjdHNbJHByb2plY3RzLmxlbmd0aCAtIDFdLmlkICsgMVxuICAgICAgICAgICAgICAgICAgICAgIDogMCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogcHJvamVjdE5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb2plY3RQYXRoXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Byb2plY3RzJywgSlNPTi5zdHJpbmdpZnkoJHByb2plY3RzKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9fT5cbiAgICAgICAgQWRkIFByb2plY3RcbiAgICAgIDwvYnV0dG9uPlxuICAgIDwvc2VjdGlvbj5cbiAgezplbHNlfVxuICAgIDxzZWN0aW9uIGNsYXNzPVwicHJvamVjdFRhYmxlXCI+XG4gICAgICA8aDE+e2N1cnJlbnRQcm9qZWN0Lm5hbWV9PC9oMT5cbiAgICAgIDx0YWJsZT5cbiAgICAgICAgPHRoZWFkPlxuICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgIDx0ZD5QYWNrYWdlPC90ZD5cbiAgICAgICAgICAgIDx0ZD5DdXJyZW50PC90ZD5cbiAgICAgICAgICAgIDx0ZD5XYW50ZWQ8L3RkPlxuICAgICAgICAgICAgPHRkPkxhdGVzdDwvdGQ+XG4gICAgICAgICAgICA8dGQ+ZW52PC90ZD5cbiAgICAgICAgICA8L3RyPlxuICAgICAgICA8L3RoZWFkPlxuICAgICAgPC90YWJsZT5cbiAgICA8L3NlY3Rpb24+XG4gIHsvaWZ9XG48L2Rpdj5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFhbUIsUUFBUSw4QkFBQyxDQUFDLEFBQzNCLGdCQUFnQixDQUFFLE9BQU8sQ0FDekIsS0FBSyxDQUFFLElBQUksQ0FDWCxXQUFXLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQzNCLE9BQU8sQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUVsQixNQUFNLDhCQUFDLENBQUMsQUFDTixVQUFVLENBQUUsTUFBTSxDQUNsQixLQUFLLENBQUUsSUFBSSxDQUNYLFNBQVMsQ0FBRSxJQUFJLENBQ2YsT0FBTyxDQUFFLElBQUksQ0FDYixhQUFhLENBQUUsTUFBTSxDQUNyQixjQUFjLENBQUUsTUFBTSxDQUN0QixlQUFlLENBQUUsTUFBTSxDQUN2QixXQUFXLENBQUUsTUFBTSxDQUNuQixNQUFNLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDZixxQkFBTSxDQUFDLEdBQUcsZUFBQyxDQUFDLEFBQ1YsS0FBSyxDQUFFLEtBQUssQ0FDWixhQUFhLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDeEIscUJBQU0sQ0FBQyxNQUFNLGVBQUMsQ0FBQyxBQUNiLE1BQU0sQ0FBRSxPQUFPLENBQ2YsZ0JBQWdCLENBQUUsSUFBSSxDQUN0QixNQUFNLENBQUUsSUFBSSxDQUNaLEtBQUssQ0FBRSxJQUFJLENBQ1gsT0FBTyxDQUFFLElBQUksQ0FDYixhQUFhLENBQUUsR0FBRyxDQUNsQixPQUFPLENBQUUsS0FBSyxBQUFFLENBQUMsQUFFckIsYUFBYSw4QkFBQyxDQUFDLEFBQ2IsS0FBSyxDQUFFLElBQUksQUFBRSxDQUFDLEFBQ2QsNEJBQWEsQ0FBQyxLQUFLLGVBQUMsQ0FBQyxBQUNuQixLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNmLDRCQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLGVBQUMsQ0FBQyxBQUM1QixNQUFNLENBQUUsSUFBSSxDQUNaLE1BQU0sQ0FBRSxDQUFDLENBQ1QsZ0JBQWdCLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    // (86:2) {:else}
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
    			add_location(h1, file$1, 87, 6, 2297);
    			attr_dev(td0, "class", "svelte-1nrx24v");
    			add_location(td0, file$1, 91, 12, 2385);
    			attr_dev(td1, "class", "svelte-1nrx24v");
    			add_location(td1, file$1, 92, 12, 2414);
    			attr_dev(td2, "class", "svelte-1nrx24v");
    			add_location(td2, file$1, 93, 12, 2443);
    			attr_dev(td3, "class", "svelte-1nrx24v");
    			add_location(td3, file$1, 94, 12, 2471);
    			attr_dev(td4, "class", "svelte-1nrx24v");
    			add_location(td4, file$1, 95, 12, 2499);
    			add_location(tr, file$1, 90, 10, 2368);
    			add_location(thead, file$1, 89, 8, 2350);
    			attr_dev(table, "class", "svelte-1nrx24v");
    			add_location(table, file$1, 88, 6, 2334);
    			attr_dev(section, "class", "projectTable svelte-1nrx24v");
    			add_location(section, file$1, 86, 4, 2260);
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
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentProject*/ 1 && t0_value !== (t0_value = /*currentProject*/ ctx[0].name + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(86:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (54:2) {#if !currentProject}
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
    			attr_dev(img, "class", "svelte-1nrx24v");
    			add_location(img, file$1, 55, 6, 1217);
    			add_location(h1, file$1, 56, 6, 1273);
    			attr_dev(button, "class", "svelte-1nrx24v");
    			add_location(button, file$1, 57, 6, 1312);
    			attr_dev(section, "class", "empty svelte-1nrx24v");
    			add_location(section, file$1, 54, 4, 1187);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, img);
    			append_dev(section, t0);
    			append_dev(section, h1);
    			append_dev(section, t2);
    			append_dev(section, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false);
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
    		source: "(54:2) {#if !currentProject}",
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
    			attr_dev(div, "class", "content svelte-1nrx24v");
    			add_location(div, file$1, 52, 0, 1137);
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
    	component_subscribe($$self, projects, $$value => $$invalidate(1, $projects = $$value));
    	let currentProjectID = false;
    	let currentProject = {};

    	menuActive.subscribe(value => {
    		currentProjectID = value ? value.split("_")[1] : false;

    		$$invalidate(0, currentProject = $projects.filter(item => {
    			return item.id === parseInt(currentProjectID);
    		})[0]);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
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
    		currentProjectID,
    		currentProject,
    		$projects
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentProjectID" in $$props) currentProjectID = $$props.currentProjectID;
    		if ("currentProject" in $$props) $$invalidate(0, currentProject = $$props.currentProject);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentProject, $projects, click_handler];
    }

    class Main extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1nrx24v-style")) add_css$1();
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
    	style.id = "svelte-1ppt6m6-style";
    	style.textContent = ".main.svelte-1ppt6m6{display:flex;height:100vh;width:100vw}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuaW1wb3J0IFNpZGViYXIgZnJvbSBcIi4vY29tcG9uZW50cy9zaWRlYmFyLnN2ZWx0ZVwiO1xuaW1wb3J0IE1haW4gZnJvbSBcIi4vY29tcG9uZW50cy9tYWluLnN2ZWx0ZVwiO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+Lm1haW4ge1xuICBkaXNwbGF5OiBmbGV4O1xuICBoZWlnaHQ6IDEwMHZoO1xuICB3aWR0aDogMTAwdnc7IH1cbjwvc3R5bGU+XG5cbjxtYWluIGNsYXNzPVwibWFpblwiPlxuICA8U2lkZWJhciAvPlxuICA8TWFpbiAvPlxuPC9tYWluPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUt3QixLQUFLLGVBQUMsQ0FBQyxBQUM3QixPQUFPLENBQUUsSUFBSSxDQUNiLE1BQU0sQ0FBRSxLQUFLLENBQ2IsS0FBSyxDQUFFLEtBQUssQUFBRSxDQUFDIn0= */";
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
    			attr_dev(main1, "class", "main svelte-1ppt6m6");
    			add_location(main1, file$2, 11, 0, 210);
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
    		if (!document.getElementById("svelte-1ppt6m6-style")) add_css$2();
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
