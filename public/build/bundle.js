
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

    /* src/components/sidebar.svelte generated by Svelte v3.23.2 */

    const { console: console_1 } = globals;
    const file = "src/components/sidebar.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1thm7fk-style";
    	style.textContent = ".sidebar.svelte-1thm7fk.svelte-1thm7fk.svelte-1thm7fk{background:rgba(0, 0, 0, 0.1);width:250px;height:100%;color:#fff;box-sizing:border-box;padding:50px 15px;overflow-x:auto;-webkit-app-region:drag}.sidebar__title.svelte-1thm7fk.svelte-1thm7fk.svelte-1thm7fk{font-size:11px;font-weight:500;letter-spacing:0.5px;color:rgba(255, 255, 255, 0.2);display:block}.globals.svelte-1thm7fk.svelte-1thm7fk.svelte-1thm7fk,.projects.svelte-1thm7fk.svelte-1thm7fk.svelte-1thm7fk{margin-bottom:15px}.globals.svelte-1thm7fk.svelte-1thm7fk button.svelte-1thm7fk.svelte-1thm7fk,.projects.svelte-1thm7fk.svelte-1thm7fk button.svelte-1thm7fk.svelte-1thm7fk{text-align:left;width:100%;border:none;color:#fff;padding:7px 15px;background-color:transparent;border-radius:7px;font-size:14px;display:block;transition:all 0.3s ease-in-out}.globals button.svelte-1thm7fk.svelte-1thm7fk .ui__iconStroke.svelte-1thm7fk.svelte-1thm7fk,.projects.svelte-1thm7fk.svelte-1thm7fk button .ui__iconStroke.svelte-1thm7fk.svelte-1thm7fk{stroke:#fff;fill:transparent}.globals button.svelte-1thm7fk.svelte-1thm7fk:hover .ui__iconStroke.svelte-1thm7fk.svelte-1thm7fk,.projects.svelte-1thm7fk.svelte-1thm7fk button:hover .ui__iconStroke.svelte-1thm7fk.svelte-1thm7fk{stroke:red}.globals.svelte-1thm7fk.svelte-1thm7fk button.active.svelte-1thm7fk.svelte-1thm7fk,.projects.svelte-1thm7fk.svelte-1thm7fk button.active.svelte-1thm7fk.svelte-1thm7fk{background-color:rgba(255, 255, 255, 0.1)}.globals button.active.svelte-1thm7fk.svelte-1thm7fk .ui__iconStroke.svelte-1thm7fk.svelte-1thm7fk,.projects.svelte-1thm7fk.svelte-1thm7fk button.active .ui__iconStroke.svelte-1thm7fk.svelte-1thm7fk{storke:red}.globals.svelte-1thm7fk button.svelte-1thm7fk i.svelte-1thm7fk,.projects.svelte-1thm7fk button.svelte-1thm7fk i.svelte-1thm7fk{width:25px;margin-right:15px;float:left;line-height:0;margin-top:-5px}.globals button.svelte-1thm7fk.svelte-1thm7fk i svg.svelte-1thm7fk.svelte-1thm7fk,.projects.svelte-1thm7fk.svelte-1thm7fk button i svg.svelte-1thm7fk.svelte-1thm7fk{transition:all 0.3s ease-in-out}.projects.svelte-1thm7fk.svelte-1thm7fk i.svelte-1thm7fk.svelte-1thm7fk{width:18px;margin-right:15px;float:left;line-height:0;margin-top:-1px}.addProject.svelte-1thm7fk.svelte-1thm7fk.svelte-1thm7fk{width:100%;border:none;background-color:rgba(0, 0, 0, 0.3);color:#fff;padding:10px;border-radius:5px;display:block}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhci5zdmVsdGUiLCJzb3VyY2VzIjpbInNpZGViYXIuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4vLyBjb25zdCB7IHNoZWxsIH0gPSByZXF1aXJlKFwiZWxlY3Ryb25cIik7XG5cbi8vIHNoZWxsLm9wZW5JdGVtKFwiZm9sZGVycGF0aFwiKTtcbmxldCBtZW51QWN0aXZlID0gXCJnbG9iYWxfMVwiLFxuICBtZW51R2xvYmFsID0gW1xuICAgIHtcbiAgICAgIGlkOiAxLFxuICAgICAgaWNvbjogYFxuICAgICAgICA8c3ZnXG4gICAgICAgICAgY2xhc3M9XCJ1aV9faWNvbkZpbGxcIlxuICAgICAgICAgIHZpZXdCb3g9XCIwIDAgMzIgMzJcIlxuICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIlxuICAgICAgICA+XG4gICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgIGQ9XCJNIDAgMTAgTCAwIDIxIEwgOSAyMSBMIDkgMjMgTCAxNiAyMyBMIDE2IDIxIEwgMzIgMjEgTCAzMiAxMCBMIDBcbiAgICAgICAgICAxMCB6IE0gMS43NzczNDM4IDExLjc3NzM0NCBMIDguODg4NjcxOSAxMS43NzczNDQgTCA4Ljg5MDYyNVxuICAgICAgICAgIDExLjc3NzM0NCBMIDguODkwNjI1IDE5LjQ0NTMxMiBMIDcuMTExMzI4MSAxOS40NDUzMTIgTCA3LjExMTMyODFcbiAgICAgICAgICAxMy41NTY2NDEgTCA1LjMzMzk4NDQgMTMuNTU2NjQxIEwgNS4zMzM5ODQ0IDE5LjQ0NTMxMiBMIDEuNzc3MzQzOFxuICAgICAgICAgIDE5LjQ0NTMxMiBMIDEuNzc3MzQzOCAxMS43NzczNDQgeiBNIDEwLjY2Nzk2OSAxMS43NzczNDQgTCAxNy43NzczNDRcbiAgICAgICAgICAxMS43NzczNDQgTCAxNy43NzkyOTcgMTEuNzc3MzQ0IEwgMTcuNzc5Mjk3IDE5LjQ0MzM1OSBMIDE0LjIyMjY1NlxuICAgICAgICAgIDE5LjQ0MzM1OSBMIDE0LjIyMjY1NiAyMS4yMjI2NTYgTCAxMC42Njc5NjkgMjEuMjIyNjU2IEwgMTAuNjY3OTY5XG4gICAgICAgICAgMTEuNzc3MzQ0IHogTSAxOS41NTY2NDEgMTEuNzc3MzQ0IEwgMzAuMjIyNjU2IDExLjc3NzM0NCBMIDMwLjIyNDYwOVxuICAgICAgICAgIDExLjc3NzM0NCBMIDMwLjIyNDYwOSAxOS40NDUzMTIgTCAyOC40NDUzMTIgMTkuNDQ1MzEyIEwgMjguNDQ1MzEyXG4gICAgICAgICAgMTMuNTU2NjQxIEwgMjYuNjY3OTY5IDEzLjU1NjY0MSBMIDI2LjY2Nzk2OSAxOS40NDUzMTIgTCAyNC44OTA2MjVcbiAgICAgICAgICAxOS40NDUzMTIgTCAyNC44OTA2MjUgMTMuNTU2NjQxIEwgMjMuMTExMzI4IDEzLjU1NjY0MSBMIDIzLjExMTMyOFxuICAgICAgICAgIDE5LjQ0NTMxMiBMIDE5LjU1NjY0MSAxOS40NDUzMTIgTCAxOS41NTY2NDEgMTEuNzc3MzQ0IHogTSAxNC4yMjI2NTZcbiAgICAgICAgICAxMy41NTY2NDEgTCAxNC4yMjI2NTYgMTcuNjY3OTY5IEwgMTYgMTcuNjY3OTY5IEwgMTYgMTMuNTU2NjQxIExcbiAgICAgICAgICAxNC4yMjI2NTYgMTMuNTU2NjQxIHpcIlxuICAgICAgICAgIC8+XG4gICAgICAgIDwvc3ZnPlxuICAgICAgYCxcbiAgICAgIHRpdGxlOiBcIk5wbVwiXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogMixcbiAgICAgIGljb246IGBcbiAgICAgICAgPHN2Z1xuICAgICAgICAgIGNsYXNzPVwidWlfX2ljb25GaWxsXCJcbiAgICAgICAgICB2aWV3Qm94PVwiMCAwIDMyIDMyXCJcbiAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCJcbiAgICAgICAgPlxuICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICBkPVwiTSAxNiAzIEMgOC44IDMgMyA4LjggMyAxNiBDIDMgMjMuMiA4LjggMjkgMTYgMjkgQyAyMy4yIDI5IDI5IDIzLjJcbiAgICAgICAgICAyOSAxNiBDIDI5IDguOCAyMy4yIDMgMTYgMyB6IE0gMTYgNSBDIDIyLjEgNSAyNyA5LjkgMjcgMTYgQyAyNyAyMi4xXG4gICAgICAgICAgMjIuMSAyNyAxNiAyNyBDIDkuOSAyNyA1IDIyLjEgNSAxNiBDIDUgOS45IDkuOSA1IDE2IDUgeiBNIDE2LjIwODk4NFxuICAgICAgICAgIDkuMDQ0OTIxOSBDIDE1Ljc1OTE4IDkuMTIxNDg0NCAxNS4zMDA3ODEgMTAuNSAxNS4zMDA3ODEgMTAuNSBDXG4gICAgICAgICAgMTUuMzAwNzgxIDEwLjUgMTQuMDk5NjA5IDEwLjMwMDc4MSAxMy4wOTk2MDkgMTEuMzAwNzgxIEMgMTIuODk5NjA5XG4gICAgICAgICAgMTEuNTAwNzgxIDEyLjcwMDM5MSAxMS41OTkyMTkgMTIuNDAwMzkxIDExLjY5OTIxOSBDIDEyLjMwMDM5MVxuICAgICAgICAgIDExLjc5OTIxOSAxMi4yIDExLjgwMDM5MSAxMiAxMi40MDAzOTEgQyAxMS42IDEzLjMwMDM5MSAxMi41OTk2MDlcbiAgICAgICAgICAxNC40MDAzOTEgMTIuNTk5NjA5IDE0LjQwMDM5MSBDIDEwLjQ5OTYwOSAxNS45MDAzOTEgMTAuNTk5MjE5XG4gICAgICAgICAgMTcuOTAwMzkxIDEwLjY5OTIxOSAxOC40MDAzOTEgQyA5LjM5OTIxODcgMTkuNTAwMzkxIDkuODk5MjE4N1xuICAgICAgICAgIDIwLjkwMDc4MSAxMC4xOTkyMTkgMjEuMzAwNzgxIEMgMTAuMzk5MjE5IDIxLjYwMDc4MSAxMC41OTkyMTkgMjEuNVxuICAgICAgICAgIDEwLjY5OTIxOSAyMS41IEMgMTAuNjk5MjE5IDIxLjYgMTAuMTk5MjE5IDIyLjIwMDM5MSAxMC42OTkyMTlcbiAgICAgICAgICAyMi40MDAzOTEgQyAxMS4xOTkyMTkgMjIuNzAwMzkxIDEyLjAwMDM5MSAyMi44MDAzOTEgMTIuNDAwMzkxXG4gICAgICAgICAgMjIuNDAwMzkxIEMgMTIuNzAwMzkxIDIyLjEwMDM5MSAxMi44MDAzOTEgMjEuNDk5MjE5IDEyLjkwMDM5MVxuICAgICAgICAgIDIxLjE5OTIxOSBDIDEzLjAwMDM5MSAyMS4wOTkyMTkgMTMuMDAwMzkxIDIxLjM5OTYwOSAxMy40MDAzOTFcbiAgICAgICAgICAyMS41OTk2MDkgQyAxMy40MDAzOTEgMjEuNTk5NjA5IDEyLjcgMjEuODk5NjA5IDEzIDIyLjU5OTYwOSBDIDEzLjFcbiAgICAgICAgICAyMi43OTk2MDkgMTMuNCAyMyAxNCAyMyBDIDE0LjIgMjMgMTYuNTk5MjE5IDIyLjg5OTIxOSAxNy4xOTkyMTlcbiAgICAgICAgICAyMi42OTkyMTkgQyAxNy41OTkyMTkgMjIuNTk5MjE5IDE3LjY5OTIxOSAyMi40MDAzOTEgMTcuNjk5MjE5XG4gICAgICAgICAgMjIuNDAwMzkxIEMgMjAuMjk5MjE5IDIxLjcwMDM5MSAyMC43OTk2MDkgMjAuNTk5MjE5IDIyLjU5OTYwOVxuICAgICAgICAgIDIwLjE5OTIxOSBDIDIzLjE5OTYwOSAyMC4wOTkyMTkgMjMuMTk5NjA5IDE5LjA5OTIxOSAyMi4wOTk2MDlcbiAgICAgICAgICAxOS4xOTkyMTkgQyAyMS4yOTk2MDkgMTkuMTk5MjE5IDIwLjYgMTkuNiAyMCAyMCBDIDE5IDIwLjYgMTguMzAwNzgxXG4gICAgICAgICAgMjAuNjk5NjA5IDE4LjMwMDc4MSAyMC41OTk2MDkgQyAxOC4yMDA3ODEgMjAuNDk5NjA5IDE4LjY5OTIxOSAxOS4zXG4gICAgICAgICAgMTguMTk5MjE5IDE4IEMgMTcuNjk5MjE5IDE2LjYgMTYuODAwMzkxIDE2LjE5OTYwOSAxNi45MDAzOTFcbiAgICAgICAgICAxNi4wOTk2MDkgQyAxNy4yMDAzOTEgMTUuNTk5NjA5IDE3Ljg5OTIxOSAxNC44MDAzOTEgMTguMTk5MjE5XG4gICAgICAgICAgMTMuNDAwMzkxIEMgMTguMjk5MjE5IDEyLjUwMDM5MSAxOC4zMDAzOTEgMTEuMDAwNzgxIDE3LjkwMDM5MVxuICAgICAgICAgIDEwLjMwMDc4MSBDIDE3LjgwMDM5MSAxMC4xMDA3ODEgMTcuMTk5MjE5IDEwLjUgMTcuMTk5MjE5IDEwLjUgQ1xuICAgICAgICAgIDE3LjE5OTIxOSAxMC41IDE2LjYwMDM5MSA5LjE5OTYwOTQgMTYuNDAwMzkxIDkuMDk5NjA5NCBDIDE2LjMzNzg5MVxuICAgICAgICAgIDkuMDQ5NjA5NCAxNi4yNzMyNDIgOS4wMzM5ODQ0IDE2LjIwODk4NCA5LjA0NDkyMTkgelwiXG4gICAgICAgICAgLz5cbiAgICAgICAgPC9zdmc+XG4gICAgICBgLFxuICAgICAgdGl0bGU6IFwiWWFyblwiXG4gICAgfVxuICBdLFxuICBtZW51UHJvamVjdHMgPSBbXG4gICAge1xuICAgICAgaWQ6IDEsXG4gICAgICB0aXRsZTogXCJUYXBjaGF0IEZyb250ZW5kXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAyLFxuICAgICAgdGl0bGU6IFwiVGFwY2hhdCBCYWNrZW5kXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAzLFxuICAgICAgdGl0bGU6IFwiRG9jdG9wIEZyb250ZW5kXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiA0LFxuICAgICAgdGl0bGU6IFwiRG9jdG9wIEJhY2tlbmRcIlxuICAgIH0sXG4gICAge1xuICAgICAgaWQ6IDUsXG4gICAgICB0aXRsZTogXCJQYXJvbGEgRnJvbnRlbmRcIlxuICAgIH0sXG4gICAge1xuICAgICAgaWQ6IDYsXG4gICAgICB0aXRsZTogXCJQYXJvbGEgQmFja2VuZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogNyxcbiAgICAgIHRpdGxlOiBcIlBhcm9sYSBQbHVnaW5cIlxuICAgIH1cbiAgXTtcbjwvc2NyaXB0PlxuXG48c3R5bGUgbGFuZz1cInNjc3NcIj4uc2lkZWJhciB7XG4gIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC4xKTtcbiAgd2lkdGg6IDI1MHB4O1xuICBoZWlnaHQ6IDEwMCU7XG4gIGNvbG9yOiAjZmZmO1xuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICBwYWRkaW5nOiA1MHB4IDE1cHg7XG4gIG92ZXJmbG93LXg6IGF1dG87XG4gIC13ZWJraXQtYXBwLXJlZ2lvbjogZHJhZzsgfVxuXG4uc2lkZWJhcl9fdGl0bGUge1xuICBmb250LXNpemU6IDExcHg7XG4gIGZvbnQtd2VpZ2h0OiA1MDA7XG4gIGxldHRlci1zcGFjaW5nOiAwLjVweDtcbiAgY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4yKTtcbiAgZGlzcGxheTogYmxvY2s7IH1cblxuLmdsb2JhbHMsXG4ucHJvamVjdHMge1xuICBtYXJnaW4tYm90dG9tOiAxNXB4OyB9XG4gIC5nbG9iYWxzIGJ1dHRvbixcbiAgLnByb2plY3RzIGJ1dHRvbiB7XG4gICAgdGV4dC1hbGlnbjogbGVmdDtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBib3JkZXI6IG5vbmU7XG4gICAgY29sb3I6ICNmZmY7XG4gICAgcGFkZGluZzogN3B4IDE1cHg7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XG4gICAgYm9yZGVyLXJhZGl1czogN3B4O1xuICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICBkaXNwbGF5OiBibG9jaztcbiAgICB0cmFuc2l0aW9uOiBhbGwgMC4zcyBlYXNlLWluLW91dDsgfVxuICAgIC5nbG9iYWxzIGJ1dHRvbiAudWlfX2ljb25TdHJva2UsXG4gICAgLnByb2plY3RzIGJ1dHRvbiAudWlfX2ljb25TdHJva2Uge1xuICAgICAgc3Ryb2tlOiAjZmZmO1xuICAgICAgZmlsbDogdHJhbnNwYXJlbnQ7IH1cbiAgICAuZ2xvYmFscyBidXR0b24gLnVpX19pY29uRmlsbCxcbiAgICAucHJvamVjdHMgYnV0dG9uIC51aV9faWNvbkZpbGwge1xuICAgICAgZmlsbDogI2ZmZjsgfVxuICAgIC5nbG9iYWxzIGJ1dHRvbjpob3ZlciAudWlfX2ljb25GaWxsLFxuICAgIC5wcm9qZWN0cyBidXR0b246aG92ZXIgLnVpX19pY29uRmlsbCB7XG4gICAgICBmaWxsOiByZWQ7IH1cbiAgICAuZ2xvYmFscyBidXR0b246aG92ZXIgLnVpX19pY29uU3Ryb2tlLFxuICAgIC5wcm9qZWN0cyBidXR0b246aG92ZXIgLnVpX19pY29uU3Ryb2tlIHtcbiAgICAgIHN0cm9rZTogcmVkOyB9XG4gICAgLmdsb2JhbHMgYnV0dG9uLmFjdGl2ZSxcbiAgICAucHJvamVjdHMgYnV0dG9uLmFjdGl2ZSB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSk7IH1cbiAgICAgIC5nbG9iYWxzIGJ1dHRvbi5hY3RpdmUgLnVpX19pY29uRmlsbCxcbiAgICAgIC5wcm9qZWN0cyBidXR0b24uYWN0aXZlIC51aV9faWNvbkZpbGwge1xuICAgICAgICBmaWxsOiByZWQ7IH1cbiAgICAgIC5nbG9iYWxzIGJ1dHRvbi5hY3RpdmUgLnVpX19pY29uU3Ryb2tlLFxuICAgICAgLnByb2plY3RzIGJ1dHRvbi5hY3RpdmUgLnVpX19pY29uU3Ryb2tlIHtcbiAgICAgICAgc3RvcmtlOiByZWQ7IH1cbiAgICAuZ2xvYmFscyBidXR0b24gaSxcbiAgICAucHJvamVjdHMgYnV0dG9uIGkge1xuICAgICAgd2lkdGg6IDI1cHg7XG4gICAgICBtYXJnaW4tcmlnaHQ6IDE1cHg7XG4gICAgICBmbG9hdDogbGVmdDtcbiAgICAgIGxpbmUtaGVpZ2h0OiAwO1xuICAgICAgbWFyZ2luLXRvcDogLTVweDsgfVxuICAgICAgLmdsb2JhbHMgYnV0dG9uIGkgc3ZnLFxuICAgICAgLnByb2plY3RzIGJ1dHRvbiBpIHN2ZyB7XG4gICAgICAgIHRyYW5zaXRpb246IGFsbCAwLjNzIGVhc2UtaW4tb3V0OyB9XG5cbi5wcm9qZWN0cyBpIHtcbiAgd2lkdGg6IDE4cHg7XG4gIG1hcmdpbi1yaWdodDogMTVweDtcbiAgZmxvYXQ6IGxlZnQ7XG4gIGxpbmUtaGVpZ2h0OiAwO1xuICBtYXJnaW4tdG9wOiAtMXB4OyB9XG5cbi5hZGRQcm9qZWN0IHtcbiAgd2lkdGg6IDEwMCU7XG4gIGJvcmRlcjogbm9uZTtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjMpO1xuICBjb2xvcjogI2ZmZjtcbiAgcGFkZGluZzogMTBweDtcbiAgYm9yZGVyLXJhZGl1czogNXB4O1xuICBkaXNwbGF5OiBibG9jazsgfVxuPC9zdHlsZT5cblxuPGFzaWRlIGNsYXNzPVwic2lkZWJhclwiPlxuICA8c2VjdGlvbiBjbGFzcz1cImdsb2JhbHNcIj5cbiAgICA8aDEgY2xhc3M9XCJzaWRlYmFyX190aXRsZVwiPkdsb2JhbHM8L2gxPlxuICAgIHsjZWFjaCBtZW51R2xvYmFsIGFzIHsgaWQsIHRpdGxlLCBpY29uIH19XG4gICAgICA8YnV0dG9uXG4gICAgICAgIGNsYXNzOmFjdGl2ZT17bWVudUFjdGl2ZSA9PT0gYGdsb2JhbF8ke2lkfWB9XG4gICAgICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgbWVudUFjdGl2ZSA9IGBnbG9iYWxfJHtpZH1gO1xuICAgICAgICB9fT5cbiAgICAgICAgPGk+XG4gICAgICAgICAge0BodG1sIGljb259XG4gICAgICAgIDwvaT5cbiAgICAgICAge3RpdGxlfVxuICAgICAgPC9idXR0b24+XG4gICAgey9lYWNofVxuICA8L3NlY3Rpb24+XG4gIDxzZWN0aW9uIGNsYXNzPVwicHJvamVjdHNcIj5cbiAgICA8aDEgY2xhc3M9XCJzaWRlYmFyX190aXRsZVwiPlByb2plY3RzPC9oMT5cbiAgICB7I2VhY2ggbWVudVByb2plY3RzIGFzIHsgaWQsIHRpdGxlIH19XG4gICAgICA8YnV0dG9uXG4gICAgICAgIGNsYXNzOmFjdGl2ZT17bWVudUFjdGl2ZSA9PT0gYHByb2plY3RfJHtpZH1gfVxuICAgICAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgIG1lbnVBY3RpdmUgPSBgcHJvamVjdF8ke2lkfWA7XG4gICAgICAgIH19PlxuICAgICAgICA8aT5cbiAgICAgICAgICA8c3ZnXG4gICAgICAgICAgICBjbGFzcz1cInVpX19pY29uU3Ryb2tlXCJcbiAgICAgICAgICAgIHN0cm9rZUxpbmVjYXA9XCJyb3VuZFwiXG4gICAgICAgICAgICBzdHJva2VXaWR0aD1cIjEuNVwiXG4gICAgICAgICAgICB2aWV3Qm94PVwiMCAwIDI0IDI0XCJcbiAgICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICAgIGQ9XCJNMjIgMTlhMiAyIDAgMCAxLTIgMkg0YTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDVsMiAzaDlhMlxuICAgICAgICAgICAgICAyIDAgMCAxIDIgMnpcIiAvPlxuICAgICAgICAgIDwvc3ZnPlxuICAgICAgICA8L2k+XG4gICAgICAgIHt0aXRsZX1cbiAgICAgIDwvYnV0dG9uPlxuICAgIHsvZWFjaH1cbiAgPC9zZWN0aW9uPlxuICA8YnV0dG9uXG4gICAgY2xhc3M9XCJhZGRQcm9qZWN0XCJcbiAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ29tYWQnKTtcbiAgICB9fT5cbiAgICBJbXBvcnQgUHJvamVjdFxuICA8L2J1dHRvbj5cbjwvYXNpZGU+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBNEdtQixRQUFRLDZDQUFDLENBQUMsQUFDM0IsVUFBVSxDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzlCLEtBQUssQ0FBRSxLQUFLLENBQ1osTUFBTSxDQUFFLElBQUksQ0FDWixLQUFLLENBQUUsSUFBSSxDQUNYLFVBQVUsQ0FBRSxVQUFVLENBQ3RCLE9BQU8sQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUNsQixVQUFVLENBQUUsSUFBSSxDQUNoQixrQkFBa0IsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUU3QixlQUFlLDZDQUFDLENBQUMsQUFDZixTQUFTLENBQUUsSUFBSSxDQUNmLFdBQVcsQ0FBRSxHQUFHLENBQ2hCLGNBQWMsQ0FBRSxLQUFLLENBQ3JCLEtBQUssQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUMvQixPQUFPLENBQUUs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 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i].id;
    	child_ctx[7] = list[i].title;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i].id;
    	child_ctx[7] = list[i].title;
    	child_ctx[10] = list[i].icon;
    	return child_ctx;
    }

    // (194:4) {#each menuGlobal as { id, title, icon }}
    function create_each_block_1(ctx) {
    	let button;
    	let i;
    	let raw_value = /*icon*/ ctx[10] + "";
    	let t0;
    	let t1_value = /*title*/ ctx[7] + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[3](/*id*/ ctx[6], ...args);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(i, "class", "svelte-1thm7fk");
    			add_location(i, file, 199, 8, 6334);
    			attr_dev(button, "class", "svelte-1thm7fk");
    			toggle_class(button, "active", /*menuActive*/ ctx[0] === `global_${/*id*/ ctx[6]}`);
    			add_location(button, file, 194, 6, 6188);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			i.innerHTML = raw_value;
    			append_dev(button, t0);
    			append_dev(button, t1);
    			append_dev(button, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*menuActive, menuGlobal*/ 3) {
    				toggle_class(button, "active", /*menuActive*/ ctx[0] === `global_${/*id*/ ctx[6]}`);
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
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(194:4) {#each menuGlobal as { id, title, icon }}",
    		ctx
    	});

    	return block;
    }

    // (209:4) {#each menuProjects as { id, title }}
    function create_each_block(ctx) {
    	let button;
    	let i;
    	let svg;
    	let path;
    	let t0;
    	let t1_value = /*title*/ ctx[7] + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[4](/*id*/ ctx[6], ...args);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(path, "d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2\n              2 0 0 1 2 2z");
    			add_location(path, file, 221, 12, 6911);
    			attr_dev(svg, "class", "ui__iconStroke svelte-1thm7fk");
    			attr_dev(svg, "strokelinecap", "round");
    			attr_dev(svg, "strokewidth", "1.5");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 215, 10, 6715);
    			attr_dev(i, "class", "svelte-1thm7fk");
    			add_location(i, file, 214, 8, 6701);
    			attr_dev(button, "class", "svelte-1thm7fk");
    			toggle_class(button, "active", /*menuActive*/ ctx[0] === `project_${/*id*/ ctx[6]}`);
    			add_location(button, file, 209, 6, 6553);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			append_dev(i, svg);
    			append_dev(svg, path);
    			append_dev(button, t0);
    			append_dev(button, t1);
    			append_dev(button, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*menuActive, menuProjects*/ 5) {
    				toggle_class(button, "active", /*menuActive*/ ctx[0] === `project_${/*id*/ ctx[6]}`);
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
    		source: "(209:4) {#each menuProjects as { id, title }}",
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
    	let section1;
    	let h11;
    	let t4;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*menuGlobal*/ ctx[1];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

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

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			section1 = element("section");
    			h11 = element("h1");
    			h11.textContent = "Projects";
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			button = element("button");
    			button.textContent = "Import Project";
    			attr_dev(h10, "class", "sidebar__title svelte-1thm7fk");
    			add_location(h10, file, 192, 4, 6096);
    			attr_dev(section0, "class", "globals svelte-1thm7fk");
    			add_location(section0, file, 191, 2, 6066);
    			attr_dev(h11, "class", "sidebar__title svelte-1thm7fk");
    			add_location(h11, file, 207, 4, 6464);
    			attr_dev(section1, "class", "projects svelte-1thm7fk");
    			add_location(section1, file, 206, 2, 6433);
    			attr_dev(button, "class", "addProject svelte-1thm7fk");
    			add_location(button, file, 230, 2, 7117);
    			attr_dev(aside, "class", "sidebar svelte-1thm7fk");
    			add_location(aside, file, 190, 0, 6040);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, aside, anchor);
    			append_dev(aside, section0);
    			append_dev(section0, h10);
    			append_dev(section0, t1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(section0, null);
    			}

    			append_dev(aside, t2);
    			append_dev(aside, section1);
    			append_dev(section1, h11);
    			append_dev(section1, t4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section1, null);
    			}

    			append_dev(aside, t5);
    			append_dev(aside, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*menuActive, menuGlobal*/ 3) {
    				each_value_1 = /*menuGlobal*/ ctx[1];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(section0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*menuActive, menuProjects*/ 5) {
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
    			destroy_each(each_blocks_1, detaching);
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
    	let menuActive = "global_1",
    		menuGlobal = [
    			{
    				id: 1,
    				icon: `
        <svg
          class="ui__iconFill"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
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
          14.222656 13.556641 z"
          />
        </svg>
      `,
    				title: "Npm"
    			},
    			{
    				id: 2,
    				icon: `
        <svg
          class="ui__iconFill"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
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
          9.0496094 16.273242 9.0339844 16.208984 9.0449219 z"
          />
        </svg>
      `,
    				title: "Yarn"
    			}
    		],
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

    	const click_handler = id => {
    		$$invalidate(0, menuActive = `global_${id}`);
    	};

    	const click_handler_1 = id => {
    		$$invalidate(0, menuActive = `project_${id}`);
    	};

    	const click_handler_2 = () => {
    		console.log("omad");
    	};

    	$$self.$capture_state = () => ({ menuActive, menuGlobal, menuProjects });

    	$$self.$inject_state = $$props => {
    		if ("menuActive" in $$props) $$invalidate(0, menuActive = $$props.menuActive);
    		if ("menuGlobal" in $$props) $$invalidate(1, menuGlobal = $$props.menuGlobal);
    		if ("menuProjects" in $$props) $$invalidate(2, menuProjects = $$props.menuProjects);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		menuActive,
    		menuGlobal,
    		menuProjects,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1thm7fk-style")) add_css();
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
