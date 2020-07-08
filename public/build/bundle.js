
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

    const util = require("util");
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

    /* src/components/sidebar.svelte generated by Svelte v3.23.2 */

    const { console: console_1 } = globals;
    const file = "src/components/sidebar.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-agdxxe-style";
    	style.textContent = ".sidebar.svelte-agdxxe.svelte-agdxxe{background:rgba(0, 0, 0, 0.1);width:250px;height:100%;color:#fff;box-sizing:border-box;padding:50px 15px;overflow-x:auto;-webkit-app-region:drag;-webkit-user-select:none}.sidebarList__title.svelte-agdxxe.svelte-agdxxe{font-size:11px;font-weight:500;letter-spacing:0.5px;color:rgba(255, 255, 255, 0.2);display:block}.sidebarList.svelte-agdxxe.svelte-agdxxe{margin-bottom:15px}.sidebarList__item.svelte-agdxxe.svelte-agdxxe{text-align:left;width:100%;border:none;color:#fff;padding:7px 15px;background-color:transparent;border-radius:7px;font-size:14px;display:block;height:30px;line-height:normal;transition:all 0.3s ease-in-out}.sidebarList__item.svelte-agdxxe span.svelte-agdxxe{float:right;background-color:rgba(255, 255, 255, 0.1);color:#fff;padding:1px 5px 0;border-radius:50px;font-size:12px;transition:all 0.3s ease-in-out}.sidebarList__item.svelte-agdxxe:hover .ui__iconGlobal.svelte-agdxxe{fill:red}.sidebarList__item.svelte-agdxxe:hover .ui__iconProject.svelte-agdxxe{stroke:red}.sidebarList__item.active.svelte-agdxxe.svelte-agdxxe{background-color:rgba(255, 255, 255, 0.1)}.sidebarList__item.active.svelte-agdxxe span.svelte-agdxxe{background-color:rgba(255, 255, 255, 0.2)}.sidebarList__item.active.svelte-agdxxe .ui__iconGlobal.svelte-agdxxe{fill:red}.sidebarList__item.active.svelte-agdxxe .ui__iconProject.svelte-agdxxe{stroke:red}.ui__iconProject.svelte-agdxxe.svelte-agdxxe{width:18px;margin-right:15px;float:left;line-height:0;margin-top:-1px;stroke:#fff;transition:all 0.3s ease-in-out;fill:transparent}.ui__iconGlobal.svelte-agdxxe.svelte-agdxxe{width:25px;margin-right:15px;float:left;line-height:0;margin-top:-5px;transition:all 0.3s ease-in-out;fill:#fff}.addProject.svelte-agdxxe.svelte-agdxxe{width:100%;border:none;background-color:rgba(0, 0, 0, 0.3);color:#fff;padding:10px;border-radius:5px;display:block}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhci5zdmVsdGUiLCJzb3VyY2VzIjpbInNpZGViYXIuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG5pbXBvcnQgeyBvbk1vdW50IH0gZnJvbSBcInN2ZWx0ZVwiO1xuaW1wb3J0IHsgZ2xvYmFsUGFja2FnZXMgfSBmcm9tIFwiLi4vdXRpbHMvc2hlbGwuanNcIjtcbmxldCBwYWNrYWdlcyA9IHt9O1xub25Nb3VudChhc3luYyAoKSA9PiB7XG4gIHBhY2thZ2VzID0gYXdhaXQgZ2xvYmFsUGFja2FnZXMoKS50aGVuKHJlcyA9PiByZXMpO1xufSk7XG5sZXQgbWVudUFjdGl2ZSA9IFwiZ2xvYmFsXzFcIixcbiAgbWVudVByb2plY3RzID0gW1xuICAgIHtcbiAgICAgIGlkOiAxLFxuICAgICAgdGl0bGU6IFwiVGFwY2hhdCBGcm9udGVuZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogMixcbiAgICAgIHRpdGxlOiBcIlRhcGNoYXQgQmFja2VuZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogMyxcbiAgICAgIHRpdGxlOiBcIkRvY3RvcCBGcm9udGVuZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogNCxcbiAgICAgIHRpdGxlOiBcIkRvY3RvcCBCYWNrZW5kXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiA1LFxuICAgICAgdGl0bGU6IFwiUGFyb2xhIEZyb250ZW5kXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiA2LFxuICAgICAgdGl0bGU6IFwiUGFyb2xhIEJhY2tlbmRcIlxuICAgIH0sXG4gICAge1xuICAgICAgaWQ6IDcsXG4gICAgICB0aXRsZTogXCJQYXJvbGEgUGx1Z2luXCJcbiAgICB9XG4gIF07XG48L3NjcmlwdD5cblxuPHN0eWxlIGxhbmc9XCJzY3NzXCI+LnNpZGViYXIge1xuICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuMSk7XG4gIHdpZHRoOiAyNTBweDtcbiAgaGVpZ2h0OiAxMDAlO1xuICBjb2xvcjogI2ZmZjtcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgcGFkZGluZzogNTBweCAxNXB4O1xuICBvdmVyZmxvdy14OiBhdXRvO1xuICAtd2Via2l0LWFwcC1yZWdpb246IGRyYWc7XG4gIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7IH1cblxuLnNpZGViYXJMaXN0X190aXRsZSB7XG4gIGZvbnQtc2l6ZTogMTFweDtcbiAgZm9udC13ZWlnaHQ6IDUwMDtcbiAgbGV0dGVyLXNwYWNpbmc6IDAuNXB4O1xuICBjb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpO1xuICBkaXNwbGF5OiBibG9jazsgfVxuXG4uc2lkZWJhckxpc3Qge1xuICBtYXJnaW4tYm90dG9tOiAxNXB4OyB9XG5cbi5zaWRlYmFyTGlzdF9faXRlbSB7XG4gIHRleHQtYWxpZ246IGxlZnQ7XG4gIHdpZHRoOiAxMDAlO1xuICBib3JkZXI6IG5vbmU7XG4gIGNvbG9yOiAjZmZmO1xuICBwYWRkaW5nOiA3cHggMTVweDtcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XG4gIGJvcmRlci1yYWRpdXM6IDdweDtcbiAgZm9udC1zaXplOiAxNHB4O1xuICBkaXNwbGF5OiBibG9jaztcbiAgaGVpZ2h0OiAzMHB4O1xuICBsaW5lLWhlaWdodDogbm9ybWFsO1xuICB0cmFuc2l0aW9uOiBhbGwgMC4zcyBlYXNlLWluLW91dDsgfVxuICAuc2lkZWJhckxpc3RfX2l0ZW0gc3BhbiB7XG4gICAgZmxvYXQ6IHJpZ2h0O1xuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKTtcbiAgICBjb2xvcjogI2ZmZjtcbiAgICBwYWRkaW5nOiAxcHggNXB4IDA7XG4gICAgYm9yZGVyLXJhZGl1czogNTBweDtcbiAgICBmb250LXNpemU6IDEycHg7XG4gICAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7IH1cbiAgLnNpZGViYXJMaXN0X19pdGVtOmhvdmVyIC51aV9faWNvbkdsb2JhbCB7XG4gICAgZmlsbDogcmVkOyB9XG4gIC5zaWRlYmFyTGlzdF9faXRlbTpob3ZlciAudWlfX2ljb25Qcm9qZWN0IHtcbiAgICBzdHJva2U6IHJlZDsgfVxuICAuc2lkZWJhckxpc3RfX2l0ZW0uYWN0aXZlIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSk7IH1cbiAgICAuc2lkZWJhckxpc3RfX2l0ZW0uYWN0aXZlIHNwYW4ge1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpOyB9XG4gICAgLnNpZGViYXJMaXN0X19pdGVtLmFjdGl2ZSAudWlfX2ljb25HbG9iYWwge1xuICAgICAgZmlsbDogcmVkOyB9XG4gICAgLnNpZGViYXJMaXN0X19pdGVtLmFjdGl2ZSAudWlfX2ljb25Qcm9qZWN0IHtcbiAgICAgIHN0cm9rZTogcmVkOyB9XG5cbi51aV9faWNvblByb2plY3Qge1xuICB3aWR0aDogMThweDtcbiAgbWFyZ2luLXJpZ2h0OiAxNXB4O1xuICBmbG9hdDogbGVmdDtcbiAgbGluZS1oZWlnaHQ6IDA7XG4gIG1hcmdpbi10b3A6IC0xcHg7XG4gIHN0cm9rZTogI2ZmZjtcbiAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7XG4gIGZpbGw6IHRyYW5zcGFyZW50OyB9XG5cbi51aV9faWNvbkdsb2JhbCB7XG4gIHdpZHRoOiAyNXB4O1xuICBtYXJnaW4tcmlnaHQ6IDE1cHg7XG4gIGZsb2F0OiBsZWZ0O1xuICBsaW5lLWhlaWdodDogMDtcbiAgbWFyZ2luLXRvcDogLTVweDtcbiAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7XG4gIGZpbGw6ICNmZmY7IH1cblxuLmFkZFByb2plY3Qge1xuICB3aWR0aDogMTAwJTtcbiAgYm9yZGVyOiBub25lO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMyk7XG4gIGNvbG9yOiAjZmZmO1xuICBwYWRkaW5nOiAxMHB4O1xuICBib3JkZXItcmFkaXVzOiA1cHg7XG4gIGRpc3BsYXk6IGJsb2NrOyB9XG48L3N0eWxlPlxuXG48YXNpZGUgY2xhc3M9XCJzaWRlYmFyXCI+XG4gIDxzZWN0aW9uIGNsYXNzPVwic2lkZWJhckxpc3RcIj5cbiAgICA8aDEgY2xhc3M9XCJzaWRlYmFyTGlzdF9fdGl0bGVcIj5HbG9iYWxzPC9oMT5cbiAgICB7I2lmIHBhY2thZ2VzLm5wbX1cbiAgICAgIDxidXR0b25cbiAgICAgICAgY2xhc3M6YWN0aXZlPXttZW51QWN0aXZlID09PSBgZ2xvYmFsXzFgfVxuICAgICAgICBjbGFzcz1cInNpZGViYXJMaXN0X19pdGVtXCJcbiAgICAgICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgICAgICBtZW51QWN0aXZlID0gYGdsb2JhbF8xYDtcbiAgICAgICAgfX0+XG4gICAgICAgIDxzdmdcbiAgICAgICAgICBjbGFzcz1cInVpX19pY29uR2xvYmFsXCJcbiAgICAgICAgICB2aWV3Qm94PVwiMCAwIDMyIDMyXCJcbiAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgIGQ9XCJNIDAgMTAgTCAwIDIxIEwgOSAyMSBMIDkgMjMgTCAxNiAyMyBMIDE2IDIxIEwgMzIgMjEgTCAzMiAxMCBMIDBcbiAgICAgICAgICAgIDEwIHogTSAxLjc3NzM0MzggMTEuNzc3MzQ0IEwgOC44ODg2NzE5IDExLjc3NzM0NCBMIDguODkwNjI1XG4gICAgICAgICAgICAxMS43NzczNDQgTCA4Ljg5MDYyNSAxOS40NDUzMTIgTCA3LjExMTMyODEgMTkuNDQ1MzEyIEwgNy4xMTEzMjgxXG4gICAgICAgICAgICAxMy41NTY2NDEgTCA1LjMzMzk4NDQgMTMuNTU2NjQxIEwgNS4zMzM5ODQ0IDE5LjQ0NTMxMiBMIDEuNzc3MzQzOFxuICAgICAgICAgICAgMTkuNDQ1MzEyIEwgMS43NzczNDM4IDExLjc3NzM0NCB6IE0gMTAuNjY3OTY5IDExLjc3NzM0NCBMIDE3Ljc3NzM0NFxuICAgICAgICAgICAgMTEuNzc3MzQ0IEwgMTcuNzc5Mjk3IDExLjc3NzM0NCBMIDE3Ljc3OTI5NyAxOS40NDMzNTkgTCAxNC4yMjI2NTZcbiAgICAgICAgICAgIDE5LjQ0MzM1OSBMIDE0LjIyMjY1NiAyMS4yMjI2NTYgTCAxMC42Njc5NjkgMjEuMjIyNjU2IEwgMTAuNjY3OTY5XG4gICAgICAgICAgICAxMS43NzczNDQgeiBNIDE5LjU1NjY0MSAxMS43NzczNDQgTCAzMC4yMjI2NTYgMTEuNzc3MzQ0IEwgMzAuMjI0NjA5XG4gICAgICAgICAgICAxMS43NzczNDQgTCAzMC4yMjQ2MDkgMTkuNDQ1MzEyIEwgMjguNDQ1MzEyIDE5LjQ0NTMxMiBMIDI4LjQ0NTMxMlxuICAgICAgICAgICAgMTMuNTU2NjQxIEwgMjYuNjY3OTY5IDEzLjU1NjY0MSBMIDI2LjY2Nzk2OSAxOS40NDUzMTIgTCAyNC44OTA2MjVcbiAgICAgICAgICAgIDE5LjQ0NTMxMiBMIDI0Ljg5MDYyNSAxMy41NTY2NDEgTCAyMy4xMTEzMjggMTMuNTU2NjQxIEwgMjMuMTExMzI4XG4gICAgICAgICAgICAxOS40NDUzMTIgTCAxOS41NTY2NDEgMTkuNDQ1MzEyIEwgMTkuNTU2NjQxIDExLjc3NzM0NCB6IE0gMTQuMjIyNjU2XG4gICAgICAgICAgICAxMy41NTY2NDEgTCAxNC4yMjI2NTYgMTcuNjY3OTY5IEwgMTYgMTcuNjY3OTY5IEwgMTYgMTMuNTU2NjQxIExcbiAgICAgICAgICAgIDE0LjIyMjY1NiAxMy41NTY2NDEgelwiIC8+XG4gICAgICAgIDwvc3ZnPlxuICAgICAgICBOcG1cbiAgICAgICAgPHNwYW4+e3BhY2thZ2VzLm5wbX08L3NwYW4+XG4gICAgICA8L2J1dHRvbj5cbiAgICB7L2lmfVxuICAgIHsjaWYgcGFja2FnZXMueWFybn1cbiAgICAgIDxidXR0b25cbiAgICAgICAgY2xhc3M6YWN0aXZlPXttZW51QWN0aXZlID09PSBgZ2xvYmFsXzJgfVxuICAgICAgICBjbGFzcz1cInNpZGViYXJMaXN0X19pdGVtXCJcbiAgICAgICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgICAgICBtZW51QWN0aXZlID0gYGdsb2JhbF8yYDtcbiAgICAgICAgfX0+XG4gICAgICAgIDxzdmdcbiAgICAgICAgICBjbGFzcz1cInVpX19pY29uR2xvYmFsXCJcbiAgICAgICAgICB2aWV3Qm94PVwiMCAwIDMyIDMyXCJcbiAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgIGQ9XCJNIDE2IDMgQyA4LjggMyAzIDguOCAzIDE2IEMgMyAyMy4yIDguOCAyOSAxNiAyOSBDIDIzLjIgMjkgMjkgMjMuMlxuICAgICAgICAgICAgMjkgMTYgQyAyOSA4LjggMjMuMiAzIDE2IDMgeiBNIDE2IDUgQyAyMi4xIDUgMjcgOS45IDI3IDE2IEMgMjcgMjIuMVxuICAgICAgICAgICAgMjIuMSAyNyAxNiAyNyBDIDkuOSAyNyA1IDIyLjEgNSAxNiBDIDUgOS45IDkuOSA1IDE2IDUgeiBNIDE2LjIwODk4NFxuICAgICAgICAgICAgOS4wNDQ5MjE5IEMgMTUuNzU5MTggOS4xMjE0ODQ0IDE1LjMwMDc4MSAxMC41IDE1LjMwMDc4MSAxMC41IENcbiAgICAgICAgICAgIDE1LjMwMDc4MSAxMC41IDE0LjA5OTYwOSAxMC4zMDA3ODEgMTMuMDk5NjA5IDExLjMwMDc4MSBDIDEyLjg5OTYwOVxuICAgICAgICAgICAgMTEuNTAwNzgxIDEyLjcwMDM5MSAxMS41OTkyMTkgMTIuNDAwMzkxIDExLjY5OTIxOSBDIDEyLjMwMDM5MVxuICAgICAgICAgICAgMTEuNzk5MjE5IDEyLjIgMTEuODAwMzkxIDEyIDEyLjQwMDM5MSBDIDExLjYgMTMuMzAwMzkxIDEyLjU5OTYwOVxuICAgICAgICAgICAgMTQuNDAwMzkxIDEyLjU5OTYwOSAxNC40MDAzOTEgQyAxMC40OTk2MDkgMTUuOTAwMzkxIDEwLjU5OTIxOVxuICAgICAgICAgICAgMTcuOTAwMzkxIDEwLjY5OTIxOSAxOC40MDAzOTEgQyA5LjM5OTIxODcgMTkuNTAwMzkxIDkuODk5MjE4N1xuICAgICAgICAgICAgMjAuOTAwNzgxIDEwLjE5OTIxOSAyMS4zMDA3ODEgQyAxMC4zOTkyMTkgMjEuNjAwNzgxIDEwLjU5OTIxOSAyMS41XG4gICAgICAgICAgICAxMC42OTkyMTkgMjEuNSBDIDEwLjY5OTIxOSAyMS42IDEwLjE5OTIxOSAyMi4yMDAzOTEgMTAuNjk5MjE5XG4gICAgICAgICAgICAyMi40MDAzOTEgQyAxMS4xOTkyMTkgMjIuNzAwMzkxIDEyLjAwMDM5MSAyMi44MDAzOTEgMTIuNDAwMzkxXG4gICAgICAgICAgICAyMi40MDAzOTEgQyAxMi43MDAzOTEgMjIuMTAwMzkxIDEyLjgwMDM5MSAyMS40OTkyMTkgMTIuOTAwMzkxXG4gICAgICAgICAgICAyMS4xOTkyMTkgQyAxMy4wMDAzOTEgMjEuMDk5MjE5IDEzLjAwMDM5MSAyMS4zOTk2MDkgMTMuNDAwMzkxXG4gICAgICAgICAgICAyMS41OTk2MDkgQyAxMy40MDAzOTEgMjEuNTk5NjA5IDEyLjcgMjEuODk5NjA5IDEzIDIyLjU5OTYwOSBDIDEzLjFcbiAgICAgICAgICAgIDIyLjc5OTYwOSAxMy40IDIzIDE0IDIzIEMgMTQuMiAyMyAxNi41OTkyMTkgMjIuODk5MjE5IDE3LjE5OTIxOVxuICAgICAgICAgICAgMjIuNjk5MjE5IEMgMTcuNTk5MjE5IDIyLjU5OTIxOSAxNy42OTkyMTkgMjIuNDAwMzkxIDE3LjY5OTIxOVxuICAgICAgICAgICAgMjIuNDAwMzkxIEMgMjAuMjk5MjE5IDIxLjcwMDM5MSAyMC43OTk2MDkgMjAuNTk5MjE5IDIyLjU5OTYwOVxuICAgICAgICAgICAgMjAuMTk5MjE5IEMgMjMuMTk5NjA5IDIwLjA5OTIxOSAyMy4xOTk2MDkgMTkuMDk5MjE5IDIyLjA5OTYwOVxuICAgICAgICAgICAgMTkuMTk5MjE5IEMgMjEuMjk5NjA5IDE5LjE5OTIxOSAyMC42IDE5LjYgMjAgMjAgQyAxOSAyMC42IDE4LjMwMDc4MVxuICAgICAgICAgICAgMjAuNjk5NjA5IDE4LjMwMDc4MSAyMC41OTk2MDkgQyAxOC4yMDA3ODEgMjAuNDk5NjA5IDE4LjY5OTIxOSAxOS4zXG4gICAgICAgICAgICAxOC4xOTkyMTkgMTggQyAxNy42OTkyMTkgMTYuNiAxNi44MDAzOTEgMTYuMTk5NjA5IDE2LjkwMDM5MVxuICAgICAgICAgICAgMTYuMDk5NjA5IEMgMTcuMjAwMzkxIDE1LjU5OTYwOSAxNy44OTkyMTkgMTQuODAwMzkxIDE4LjE5OTIxOVxuICAgICAgICAgICAgMTMuNDAwMzkxIEMgMTguMjk5MjE5IDEyLjUwMDM5MSAxOC4zMDAzOTEgMTEuMDAwNzgxIDE3LjkwMDM5MVxuICAgICAgICAgICAgMTAuMzAwNzgxIEMgMTcuODAwMzkxIDEwLjEwMDc4MSAxNy4xOTkyMTkgMTAuNSAxNy4xOTkyMTkgMTAuNSBDXG4gICAgICAgICAgICAxNy4xOTkyMTkgMTAuNSAxNi42MDAzOTEgOS4xOTk2MDk0IDE2LjQwMDM5MSA5LjA5OTYwOTQgQyAxNi4zMzc4OTFcbiAgICAgICAgICAgIDkuMDQ5NjA5NCAxNi4yNzMyNDIgOS4wMzM5ODQ0IDE2LjIwODk4NCA5LjA0NDkyMTkgelwiIC8+XG4gICAgICAgIDwvc3ZnPlxuICAgICAgICBZYXJuXG4gICAgICAgIDxzcGFuPntwYWNrYWdlcy55YXJufTwvc3Bhbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgIHsvaWZ9XG4gICAgeyNpZiBwYWNrYWdlcy5wbnBtfVxuICAgICAgPGJ1dHRvblxuICAgICAgICBjbGFzczphY3RpdmU9e21lbnVBY3RpdmUgPT09IGBnbG9iYWxfM2B9XG4gICAgICAgIGNsYXNzPVwic2lkZWJhckxpc3RfX2l0ZW1cIlxuICAgICAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgIG1lbnVBY3RpdmUgPSBgZ2xvYmFsXzNgO1xuICAgICAgICB9fT5cbiAgICAgICAgPHN2Z1xuICAgICAgICAgIGNsYXNzPVwidWlfX2ljb25HbG9iYWxcIlxuICAgICAgICAgIHZpZXdCb3g9XCIwIDAgMzIgMzJcIlxuICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICA8cGF0aFxuICAgICAgICAgICAgZD1cIk0gMTYgMyBDIDguOCAzIDMgOC44IDMgMTYgQyAzIDIzLjIgOC44IDI5IDE2IDI5IEMgMjMuMiAyOSAyOSAyMy4yXG4gICAgICAgICAgICAyOSAxNiBDIDI5IDguOCAyMy4yIDMgMTYgMyB6IE0gMTYgNSBDIDIyLjEgNSAyNyA5LjkgMjcgMTYgQyAyNyAyMi4xXG4gICAgICAgICAgICAyMi4xIDI3IDE2IDI3IEMgOS45IDI3IDUgMjIuMSA1IDE2IEMgNSA5LjkgOS45IDUgMTYgNSB6IE0gMTYuMjA4OTg0XG4gICAgICAgICAgICA5LjA0NDkyMTkgQyAxNS43NTkxOCA5LjEyMTQ4NDQgMTUuMzAwNzgxIDEwLjUgMTUuMzAwNzgxIDEwLjUgQ1xuICAgICAgICAgICAgMTUuMzAwNzgxIDEwLjUgMTQuMDk5NjA5IDEwLjMwMDc4MSAxMy4wOTk2MDkgMTEuMzAwNzgxIEMgMTIuODk5NjA5XG4gICAgICAgICAgICAxMS41MDA3ODEgMTIuNzAwMzkxIDExLjU5OTIxOSAxMi40MDAzOTEgMTEuNjk5MjE5IEMgMTIuMzAwMzkxXG4gICAgICAgICAgICAxMS43OTkyMTkgMTIuMiAxMS44MDAzOTEgMTIgMTIuNDAwMzkxIEMgMTEuNiAxMy4zMDAzOTEgMTIuNTk5NjA5XG4gICAgICAgICAgICAxNC40MDAzOTEgMTIuNTk5NjA5IDE0LjQwMDM5MSBDIDEwLjQ5OTYwOSAxNS45MDAzOTEgMTAuNTk5MjE5XG4gICAgICAgICAgICAxNy45MDAzOTEgMTAuNjk5MjE5IDE4LjQwMDM5MSBDIDkuMzk5MjE4NyAxOS41MDAzOTEgOS44OTkyMTg3XG4gICAgICAgICAgICAyMC45MDA3ODEgMTAuMTk5MjE5IDIxLjMwMDc4MSBDIDEwLjM5OTIxOSAyMS42MDA3ODEgMTAuNTk5MjE5IDIxLjVcbiAgICAgICAgICAgIDEwLjY5OTIxOSAyMS41IEMgMTAuNjk5MjE5IDIxLjYgMTAuMTk5MjE5IDIyLjIwMDM5MSAxMC42OTkyMTlcbiAgICAgICAgICAgIDIyLjQwMDM5MSBDIDExLjE5OTIxOSAyMi43MDAzOTEgMTIuMDAwMzkxIDIyLjgwMDM5MSAxMi40MDAzOTFcbiAgICAgICAgICAgIDIyLjQwMDM5MSBDIDEyLjcwMDM5MSAyMi4xMDAzOTEgMTIuODAwMzkxIDIxLjQ5OTIxOSAxMi45MDAzOTFcbiAgICAgICAgICAgIDIxLjE5OTIxOSBDIDEzLjAwMDM5MSAyMS4wOTkyMTkgMTMuMDAwMzkxIDIxLjM5OTYwOSAxMy40MDAzOTFcbiAgICAgICAgICAgIDIxLjU5OTYwOSBDIDEzLjQwMDM5MSAyMS41OTk2MDkgMTIuNyAyMS44OTk2MDkgMTMgMjIuNTk5NjA5IEMgMTMuMVxuICAgICAgICAgICAgMjIuNzk5NjA5IDEzLjQgMjMgMTQgMjMgQyAxNC4yIDIzIDE2LjU5OTIxOSAyMi44OTkyMTkgMTcuMTk5MjE5XG4gICAgICAgICAgICAyMi42OTkyMTkgQyAxNy41OTkyMTkgMjIuNTk5MjE5IDE3LjY5OTIxOSAyMi40MDAzOTEgMTcuNjk5MjE5XG4gICAgICAgICAgICAyMi40MDAzOTEgQyAyMC4yOTkyMTkgMjEuNzAwMzkxIDIwLjc5OTYwOSAyMC41OTkyMTkgMjIuNTk5NjA5XG4gICAgICAgICAgICAyMC4xOTkyMTkgQyAyMy4xOTk2MDkgMjAuMDk5MjE5IDIzLjE5OTYwOSAxOS4wOTkyMTkgMjIuMDk5NjA5XG4gICAgICAgICAgICAxOS4xOTkyMTkgQyAyMS4yOTk2MDkgMTkuMTk5MjE5IDIwLjYgMTkuNiAyMCAyMCBDIDE5IDIwLjYgMTguMzAwNzgxXG4gICAgICAgICAgICAyMC42OTk2MDkgMTguMzAwNzgxIDIwLjU5OTYwOSBDIDE4LjIwMDc4MSAyMC40OTk2MDkgMTguNjk5MjE5IDE5LjNcbiAgICAgICAgICAgIDE4LjE5OTIxOSAxOCBDIDE3LjY5OTIxOSAxNi42IDE2LjgwMDM5MSAxNi4xOTk2MDkgMTYuOTAwMzkxXG4gICAgICAgICAgICAxNi4wOTk2MDkgQyAxNy4yMDAzOTEgMTUuNTk5NjA5IDE3Ljg5OTIxOSAxNC44MDAzOTEgMTguMTk5MjE5XG4gICAgICAgICAgICAxMy40MDAzOTEgQyAxOC4yOTkyMTkgMTIuNTAwMzkxIDE4LjMwMDM5MSAxMS4wMDA3ODEgMTcuOTAwMzkxXG4gICAgICAgICAgICAxMC4zMDA3ODEgQyAxNy44MDAzOTEgMTAuMTAwNzgxIDE3LjE5OTIxOSAxMC41IDE3LjE5OTIxOSAxMC41IENcbiAgICAgICAgICAgIDE3LjE5OTIxOSAxMC41IDE2LjYwMDM5MSA5LjE5OTYwOTQgMTYuNDAwMzkxIDkuMDk5NjA5NCBDIDE2LjMzNzg5MVxuICAgICAgICAgICAgOS4wNDk2MDk0IDE2LjI3MzI0MiA5LjAzMzk4NDQgMTYuMjA4OTg0IDkuMDQ0OTIxOSB6XCIgLz5cbiAgICAgICAgPC9zdmc+XG4gICAgICAgIFBucG1cbiAgICAgICAgPHNwYW4+e3BhY2thZ2VzLnBucG19PC9zcGFuPlxuICAgICAgPC9idXR0b24+XG4gICAgey9pZn1cbiAgPC9zZWN0aW9uPlxuICA8c2VjdGlvbiBjbGFzcz1cInNpZGViYXJMaXN0XCI+XG4gICAgPGgxIGNsYXNzPVwic2lkZWJhckxpc3RfX3RpdGxlXCI+UHJvamVjdHM8L2gxPlxuICAgIHsjZWFjaCBtZW51UHJvamVjdHMgYXMgeyBpZCwgdGl0bGUgfX1cbiAgICAgIDxidXR0b25cbiAgICAgICAgY2xhc3M6YWN0aXZlPXttZW51QWN0aXZlID09PSBgcHJvamVjdF8ke2lkfWB9XG4gICAgICAgIGNsYXNzPVwic2lkZWJhckxpc3RfX2l0ZW1cIlxuICAgICAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgIG1lbnVBY3RpdmUgPSBgcHJvamVjdF8ke2lkfWA7XG4gICAgICAgIH19PlxuICAgICAgICA8c3ZnXG4gICAgICAgICAgY2xhc3M9XCJ1aV9faWNvblByb2plY3RcIlxuICAgICAgICAgIHN0cm9rZUxpbmVjYXA9XCJyb3VuZFwiXG4gICAgICAgICAgc3Ryb2tlV2lkdGg9XCIxLjVcIlxuICAgICAgICAgIHZpZXdCb3g9XCIwIDAgMjQgMjRcIlxuICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICA8cGF0aFxuICAgICAgICAgICAgZD1cIk0yMiAxOWEyIDIgMCAwIDEtMiAySDRhMiAyIDAgMCAxLTItMlY1YTIgMiAwIDAgMSAyLTJoNWwyIDNoOWEyIDJcbiAgICAgICAgICAgIDAgMCAxIDIgMnpcIiAvPlxuICAgICAgICA8L3N2Zz5cbiAgICAgICAge3RpdGxlfVxuICAgICAgPC9idXR0b24+XG4gICAgey9lYWNofVxuICA8L3NlY3Rpb24+XG4gIDxidXR0b25cbiAgICBjbGFzcz1cImFkZFByb2plY3RcIlxuICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnb21hZCcpO1xuICAgIH19PlxuICAgIEltcG9ydCBQcm9qZWN0XG4gIDwvYnV0dG9uPlxuPC9hc2lkZT5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF3Q21CLFFBQVEsNEJBQUMsQ0FBQyxBQUMzQixVQUFVLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDOUIsS0FBSyxDQUFFLEtBQUssQ0FDWixNQUFNLENBQUUsSUFBSSxDQUNaLEtBQUssQ0FBRSxJQUFJLENBQ1gsVUFBVSxDQUFFLFVBQVUsQ0FDdEIsT0FBTyxDQUFFLElBQUksQ0FBQyxJQUFJLENBQ2xCLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLGtCQUFrQixDQUFFLElBQUksQ0FDeEIsbUJBQW1CLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFOUIsbUJBQW1CLDRCQUFDLENBQUMsQUFDbkIsU0FBUyxDQUFFLElBQUksQ0FDZixXQUFXLENBQUUsR0FBRyxDQUNoQixjQUFjLENBQUUsS0FBSyxDQUNyQixLQUFLLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDL0IsT0FBTyxDQUFFLEtBQUssQUFBRSxDQUFDLEFBRW5CLFlBQVksNEJBQUMsQ0FBQyxBQUNaLGFBQWEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUV4QixrQkFBa0IsNEJBQUMsQ0FBQyxBQUNsQixVQUFVLENBQUUsSUFBSSxDQUNoQixLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxJQUFJLENBQ1osS0FBSyxDQUFFLElBQUksQ0FDWCxPQUFPLENBQUUsR0FBRyxDQUFDLElBQUksQ0FDakIsZ0JBQWdCLENBQUUsV0FBVyxDQUM3QixhQUFhLENBQUUsR0FBRyxDQUNsQixTQUFTLENBQUUsSUFBSSxDQUNmLE9BQU8sQ0FBRSxLQUFLLENBQ2QsTUFBTSxDQUFFLElBQUksQ0FDWixXQUFXLENBQUUsTUFBTSxDQUNuQixVQUFVLENBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEFBQUUsQ0FBQyxBQUNuQyxnQ0FBa0IsQ0FBQyxJQUFJLGNBQUMsQ0FBQyxBQUN2QixLQUFLLENBQUUsS0FBSyxDQUNaLGdCQUFnQixDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzFDLEtBQUssQ0FBRSxJQUFJLENBQ1gsT0FBTyxDQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUNsQixhQUFhLENBQUUsSUFBSSxDQUNuQixTQUFTLENBQUUsSUFBSSxDQUNmLFVBQVUsQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQUFBRSxDQUFDLEFBQ3JDLGdDQUFrQixNQUFNLENBQUMsZUFBZSxjQUFDLENBQUMsQUFDeEMsSUFBSSxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBQ2QsZ0NBQWtCLE1BQU0sQ0FBQyxnQkFBZ0IsY0FBQyxDQUFDLEFBQ3pDLE1BQU0sQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUNoQixrQkFBa0IsT0FBTyw0QkFBQyxDQUFDLEFBQ3pCLGdCQUFnQixDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUUsQ0FBQyxBQUM3QyxrQkFBa0IscUJBQU8sQ0FBQyxJQUFJLGNBQUMsQ0FBQyxBQUM5QixnQkFBZ0IsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUFFLENBQUMsQUFDL0Msa0JBQWtCLHFCQUFPLENBQUMsZUFBZSxjQUFDLENBQUMsQUFDekMsSUFBSSxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBQ2Qsa0JBQWtCLHFCQUFPLENBQUMsZ0JBQWdCLGNBQUMsQ0FBQyxBQUMxQyxNQUFNLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFcEIsZ0JBQWdCLDRCQUFDLENBQUMsQUFDaEIsS0FBSyxDQUFFLElBQUksQ0FDWCxZQUFZLENBQUUsSUFBSSxDQUNsQixLQUFLLENBQUUsSUFBSSxDQUNYLFdBQVcsQ0FBRSxDQUFDLENBQ2QsVUFBVSxDQUFFLElBQUksQ0FDaEIsTUFBTSxDQUFFLElBQUksQ0FDWixVQUFVLENBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQ2hDLElBQUksQ0FBRSxXQUFXLEFBQUUsQ0FBQyxBQUV0QixlQUFlLDRCQUFDLENBQUMsQUFDZixLQUFLLENBQUUsSUFBSSxDQUNYLFlBQVksQ0FBRSxJQUFJLENBQ2xCLEtBQUssQ0FBRSxJQUFJLENBQ1gsV0FBVyxDQUFFLENBQUMsQ0FDZCxVQUFVLENBQUUsSUFBSSxDQUNoQixVQUFVLENBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQ2hDLElBQUksQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUVmLFdBQVcsNEJBQUMsQ0FBQyxBQUNYLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixnQkFBZ0IsQ0FBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUNwQyxLQUFLLENBQUUsSUFBSSxDQUNYLE9BQU8sQ0FBRSxJQUFJLENBQ2IsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsT0FBTyxDQUFFLEtBQUssQUFBRSxDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i].id;
    	child_ctx[9] = list[i].title;
    	return child_ctx;
    }

    // (128:4) {#if packages.npm}
    function create_if_block_2(ctx) {
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
    			add_location(path, file, 138, 10, 2951);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-agdxxe");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 134, 8, 2827);
    			attr_dev(span, "class", "svelte-agdxxe");
    			add_location(span, file, 155, 8, 4042);
    			attr_dev(button, "class", "sidebarList__item svelte-agdxxe");
    			toggle_class(button, "active", /*menuActive*/ ctx[1] === `global_1`);
    			add_location(button, file, 128, 6, 2655);
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

    			if (dirty & /*menuActive*/ 2) {
    				toggle_class(button, "active", /*menuActive*/ ctx[1] === `global_1`);
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
    		source: "(128:4) {#if packages.npm}",
    		ctx
    	});

    	return block;
    }

    // (159:4) {#if packages.yarn}
    function create_if_block_1(ctx) {
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
    			add_location(path, file, 169, 10, 4422);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-agdxxe");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 165, 8, 4298);
    			attr_dev(span, "class", "svelte-agdxxe");
    			add_location(span, file, 199, 8, 6512);
    			attr_dev(button, "class", "sidebarList__item svelte-agdxxe");
    			toggle_class(button, "active", /*menuActive*/ ctx[1] === `global_2`);
    			add_location(button, file, 159, 6, 4126);
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

    			if (dirty & /*menuActive*/ 2) {
    				toggle_class(button, "active", /*menuActive*/ ctx[1] === `global_2`);
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
    		source: "(159:4) {#if packages.yarn}",
    		ctx
    	});

    	return block;
    }

    // (203:4) {#if packages.pnpm}
    function create_if_block(ctx) {
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
    			add_location(path, file, 213, 10, 6893);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-agdxxe");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 209, 8, 6769);
    			attr_dev(span, "class", "svelte-agdxxe");
    			add_location(span, file, 243, 8, 8983);
    			attr_dev(button, "class", "sidebarList__item svelte-agdxxe");
    			toggle_class(button, "active", /*menuActive*/ ctx[1] === `global_3`);
    			add_location(button, file, 203, 6, 6597);
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

    			if (dirty & /*menuActive*/ 2) {
    				toggle_class(button, "active", /*menuActive*/ ctx[1] === `global_3`);
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
    		id: create_if_block.name,
    		type: "if",
    		source: "(203:4) {#if packages.pnpm}",
    		ctx
    	});

    	return block;
    }

    // (250:4) {#each menuProjects as { id, title }}
    function create_each_block(ctx) {
    	let button;
    	let svg;
    	let path;
    	let t0;
    	let t1_value = /*title*/ ctx[9] + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[6](/*id*/ ctx[8], ...args);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(path, "d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2\n            0 0 1 2 2z");
    			add_location(path, file, 262, 10, 9547);
    			attr_dev(svg, "class", "ui__iconProject svelte-agdxxe");
    			attr_dev(svg, "strokelinecap", "round");
    			attr_dev(svg, "strokewidth", "1.5");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 256, 8, 9362);
    			attr_dev(button, "class", "sidebarList__item svelte-agdxxe");
    			toggle_class(button, "active", /*menuActive*/ ctx[1] === `project_${/*id*/ ctx[8]}`);
    			add_location(button, file, 250, 6, 9180);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path);
    			append_dev(button, t0);
    			append_dev(button, t1);
    			append_dev(button, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*menuActive, menuProjects*/ 6) {
    				toggle_class(button, "active", /*menuActive*/ ctx[1] === `project_${/*id*/ ctx[8]}`);
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
    		id: create_each_block.name,
    		type: "each",
    		source: "(250:4) {#each menuProjects as { id, title }}",
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
    	let if_block0 = /*packages*/ ctx[0].npm && create_if_block_2(ctx);
    	let if_block1 = /*packages*/ ctx[0].yarn && create_if_block_1(ctx);
    	let if_block2 = /*packages*/ ctx[0].pnpm && create_if_block(ctx);
    	let each_value = /*menuProjects*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

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

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			button = element("button");
    			button.textContent = "Import Project";
    			attr_dev(h10, "class", "sidebarList__title svelte-agdxxe");
    			add_location(h10, file, 126, 4, 2582);
    			attr_dev(section0, "class", "sidebarList svelte-agdxxe");
    			add_location(section0, file, 125, 2, 2548);
    			attr_dev(h11, "class", "sidebarList__title svelte-agdxxe");
    			add_location(h11, file, 248, 4, 9087);
    			attr_dev(section1, "class", "sidebarList svelte-agdxxe");
    			add_location(section1, file, 247, 2, 9053);
    			attr_dev(button, "class", "addProject svelte-agdxxe");
    			add_location(button, file, 270, 2, 9734);
    			attr_dev(aside, "class", "sidebar svelte-agdxxe");
    			add_location(aside, file, 124, 0, 2522);
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

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section1, null);
    			}

    			append_dev(aside, t7);
    			append_dev(aside, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_4*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*packages*/ ctx[0].npm) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
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
    					if_block1 = create_if_block_1(ctx);
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
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(section0, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*menuActive, menuProjects*/ 6) {
    				each_value = /*menuProjects*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(section1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(aside);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_each(each_blocks, detaching);
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
    	let packages = {};

    	onMount(async () => {
    		$$invalidate(0, packages = await globalPackages().then(res => res));
    	});

    	let menuActive = "global_1",
    		menuProjects = [
    			{ id: 1, title: "Tapchat Frontend" },
    			{ id: 2, title: "Tapchat Backend" },
    			{ id: 3, title: "Doctop Frontend" },
    			{ id: 4, title: "Doctop Backend" },
    			{ id: 5, title: "Parola Frontend" },
    			{ id: 6, title: "Parola Backend" },
    			{ id: 7, title: "Parola Plugin" }
    		];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Sidebar", $$slots, []);

    	const click_handler = () => {
    		$$invalidate(1, menuActive = `global_1`);
    	};

    	const click_handler_1 = () => {
    		$$invalidate(1, menuActive = `global_2`);
    	};

    	const click_handler_2 = () => {
    		$$invalidate(1, menuActive = `global_3`);
    	};

    	const click_handler_3 = id => {
    		$$invalidate(1, menuActive = `project_${id}`);
    	};

    	const click_handler_4 = () => {
    		console.log("omad");
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		globalPackages,
    		packages,
    		menuActive,
    		menuProjects
    	});

    	$$self.$inject_state = $$props => {
    		if ("packages" in $$props) $$invalidate(0, packages = $$props.packages);
    		if ("menuActive" in $$props) $$invalidate(1, menuActive = $$props.menuActive);
    		if ("menuProjects" in $$props) $$invalidate(2, menuProjects = $$props.menuProjects);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		packages,
    		menuActive,
    		menuProjects,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-agdxxe-style")) add_css();
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

    const file$1 = "src/components/main.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1mm3a10-style";
    	style.textContent = ".content.svelte-1mm3a10{background-color:#1d1d1d;width:100%;border-left:1px solid #000;padding:10px}h1.svelte-1mm3a10{color:#fff;font-size:30px}p.svelte-1mm3a10{color:#fff;font-size:15px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5zdmVsdGUiLCJzb3VyY2VzIjpbIm1haW4uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdHlsZT5cbi5jb250ZW50IHtcbiAgYmFja2dyb3VuZC1jb2xvcjogIzFkMWQxZDtcbiAgd2lkdGg6IDEwMCU7XG4gIGJvcmRlci1sZWZ0OiAxcHggc29saWQgIzAwMDtcbiAgcGFkZGluZzogMTBweDtcbn1cbmgxIHtcbiAgY29sb3I6ICNmZmY7XG4gIC8qIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7ICovXG4gIGZvbnQtc2l6ZTogMzBweDtcbiAgLyogZm9udC13ZWlnaHQ6IDEwMDsgKi9cbn1cbnAge1xuICBjb2xvcjogI2ZmZjtcbiAgZm9udC1zaXplOiAxNXB4O1xufVxuPC9zdHlsZT5cblxuPHNlY3Rpb24gY2xhc3M9XCJjb250ZW50XCI+XG4gIDxoMT5UaGFuayB5b3UgZm9yIHVzaW5nIG91ciBhcHA8L2gxPlxuICA8cD5cbiAgICBWaXNpdCB0aGVcbiAgICA8YSBocmVmPVwiaHR0cDovL21laGQuaXJcIj5NZWhkaSBSZXphZWkgV2ViU2l0ZTwvYT5cbiAgICB0byBTZWUgb3RoZXIgYXBwcy5cbiAgPC9wPlxuPC9zZWN0aW9uPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLFFBQVEsZUFBQyxDQUFDLEFBQ1IsZ0JBQWdCLENBQUUsT0FBTyxDQUN6QixLQUFLLENBQUUsSUFBSSxDQUNYLFdBQVcsQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDM0IsT0FBTyxDQUFFLElBQUksQUFDZixDQUFDLEFBQ0QsRUFBRSxlQUFDLENBQUMsQUFDRixLQUFLLENBQUUsSUFBSSxDQUVYLFNBQVMsQ0FBRSxJQUFJLEFBRWpCLENBQUMsQUFDRCxDQUFDLGVBQUMsQ0FBQyxBQUNELEtBQUssQ0FBRSxJQUFJLENBQ1gsU0FBUyxDQUFFLElBQUksQUFDakIsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let section;
    	let h1;
    	let t1;
    	let p;
    	let t2;
    	let a;
    	let t4;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h1 = element("h1");
    			h1.textContent = "Thank you for using our app";
    			t1 = space();
    			p = element("p");
    			t2 = text("Visit the\n    ");
    			a = element("a");
    			a.textContent = "Mehdi Rezaei WebSite";
    			t4 = text("\n    to See other apps.");
    			attr_dev(h1, "class", "svelte-1mm3a10");
    			add_location(h1, file$1, 20, 2, 293);
    			attr_dev(a, "href", "http://mehd.ir");
    			add_location(a, file$1, 23, 4, 354);
    			attr_dev(p, "class", "svelte-1mm3a10");
    			add_location(p, file$1, 21, 2, 332);
    			attr_dev(section, "class", "content svelte-1mm3a10");
    			add_location(section, file$1, 19, 0, 265);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h1);
    			append_dev(section, t1);
    			append_dev(section, p);
    			append_dev(p, t2);
    			append_dev(p, a);
    			append_dev(p, t4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
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

    function instance$1($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Main", $$slots, []);
    	return [];
    }

    class Main extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1mm3a10-style")) add_css$1();
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
