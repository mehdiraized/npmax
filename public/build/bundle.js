
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
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
        if (text.wholeText === data)
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

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var check = function (it) {
      return it && it.Math == Math && it;
    };

    // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
    var global_1 =
      // eslint-disable-next-line no-undef
      check(typeof globalThis == 'object' && globalThis) ||
      check(typeof window == 'object' && window) ||
      check(typeof self == 'object' && self) ||
      check(typeof commonjsGlobal == 'object' && commonjsGlobal) ||
      // eslint-disable-next-line no-new-func
      Function('return this')();

    var fails = function (exec) {
      try {
        return !!exec();
      } catch (error) {
        return true;
      }
    };

    // Thank's IE8 for his funny defineProperty
    var descriptors = !fails(function () {
      return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] != 7;
    });

    var nativePropertyIsEnumerable = {}.propertyIsEnumerable;
    var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

    // Nashorn ~ JDK8 bug
    var NASHORN_BUG = getOwnPropertyDescriptor && !nativePropertyIsEnumerable.call({ 1: 2 }, 1);

    // `Object.prototype.propertyIsEnumerable` method implementation
    // https://tc39.github.io/ecma262/#sec-object.prototype.propertyisenumerable
    var f = NASHORN_BUG ? function propertyIsEnumerable(V) {
      var descriptor = getOwnPropertyDescriptor(this, V);
      return !!descriptor && descriptor.enumerable;
    } : nativePropertyIsEnumerable;

    var objectPropertyIsEnumerable = {
    	f: f
    };

    var createPropertyDescriptor = function (bitmap, value) {
      return {
        enumerable: !(bitmap & 1),
        configurable: !(bitmap & 2),
        writable: !(bitmap & 4),
        value: value
      };
    };

    var toString = {}.toString;

    var classofRaw = function (it) {
      return toString.call(it).slice(8, -1);
    };

    var split = ''.split;

    // fallback for non-array-like ES3 and non-enumerable old V8 strings
    var indexedObject = fails(function () {
      // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
      // eslint-disable-next-line no-prototype-builtins
      return !Object('z').propertyIsEnumerable(0);
    }) ? function (it) {
      return classofRaw(it) == 'String' ? split.call(it, '') : Object(it);
    } : Object;

    // `RequireObjectCoercible` abstract operation
    // https://tc39.github.io/ecma262/#sec-requireobjectcoercible
    var requireObjectCoercible = function (it) {
      if (it == undefined) throw TypeError("Can't call method on " + it);
      return it;
    };

    // toObject with fallback for non-array-like ES3 strings



    var toIndexedObject = function (it) {
      return indexedObject(requireObjectCoercible(it));
    };

    var isObject = function (it) {
      return typeof it === 'object' ? it !== null : typeof it === 'function';
    };

    // `ToPrimitive` abstract operation
    // https://tc39.github.io/ecma262/#sec-toprimitive
    // instead of the ES6 spec version, we didn't implement @@toPrimitive case
    // and the second argument - flag - preferred type is a string
    var toPrimitive = function (input, PREFERRED_STRING) {
      if (!isObject(input)) return input;
      var fn, val;
      if (PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
      if (typeof (fn = input.valueOf) == 'function' && !isObject(val = fn.call(input))) return val;
      if (!PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
      throw TypeError("Can't convert object to primitive value");
    };

    var hasOwnProperty = {}.hasOwnProperty;

    var has = function (it, key) {
      return hasOwnProperty.call(it, key);
    };

    var document$1 = global_1.document;
    // typeof document.createElement is 'object' in old IE
    var EXISTS = isObject(document$1) && isObject(document$1.createElement);

    var documentCreateElement = function (it) {
      return EXISTS ? document$1.createElement(it) : {};
    };

    // Thank's IE8 for his funny defineProperty
    var ie8DomDefine = !descriptors && !fails(function () {
      return Object.defineProperty(documentCreateElement('div'), 'a', {
        get: function () { return 7; }
      }).a != 7;
    });

    var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

    // `Object.getOwnPropertyDescriptor` method
    // https://tc39.github.io/ecma262/#sec-object.getownpropertydescriptor
    var f$1 = descriptors ? nativeGetOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
      O = toIndexedObject(O);
      P = toPrimitive(P, true);
      if (ie8DomDefine) try {
        return nativeGetOwnPropertyDescriptor(O, P);
      } catch (error) { /* empty */ }
      if (has(O, P)) return createPropertyDescriptor(!objectPropertyIsEnumerable.f.call(O, P), O[P]);
    };

    var objectGetOwnPropertyDescriptor = {
    	f: f$1
    };

    var anObject = function (it) {
      if (!isObject(it)) {
        throw TypeError(String(it) + ' is not an object');
      } return it;
    };

    var nativeDefineProperty = Object.defineProperty;

    // `Object.defineProperty` method
    // https://tc39.github.io/ecma262/#sec-object.defineproperty
    var f$2 = descriptors ? nativeDefineProperty : function defineProperty(O, P, Attributes) {
      anObject(O);
      P = toPrimitive(P, true);
      anObject(Attributes);
      if (ie8DomDefine) try {
        return nativeDefineProperty(O, P, Attributes);
      } catch (error) { /* empty */ }
      if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
      if ('value' in Attributes) O[P] = Attributes.value;
      return O;
    };

    var objectDefineProperty = {
    	f: f$2
    };

    var createNonEnumerableProperty = descriptors ? function (object, key, value) {
      return objectDefineProperty.f(object, key, createPropertyDescriptor(1, value));
    } : function (object, key, value) {
      object[key] = value;
      return object;
    };

    var setGlobal = function (key, value) {
      try {
        createNonEnumerableProperty(global_1, key, value);
      } catch (error) {
        global_1[key] = value;
      } return value;
    };

    var SHARED = '__core-js_shared__';
    var store = global_1[SHARED] || setGlobal(SHARED, {});

    var sharedStore = store;

    var functionToString = Function.toString;

    // this helper broken in `3.4.1-3.4.4`, so we can't use `shared` helper
    if (typeof sharedStore.inspectSource != 'function') {
      sharedStore.inspectSource = function (it) {
        return functionToString.call(it);
      };
    }

    var inspectSource = sharedStore.inspectSource;

    var WeakMap$1 = global_1.WeakMap;

    var nativeWeakMap = typeof WeakMap$1 === 'function' && /native code/.test(inspectSource(WeakMap$1));

    var shared = createCommonjsModule(function (module) {
    (module.exports = function (key, value) {
      return sharedStore[key] || (sharedStore[key] = value !== undefined ? value : {});
    })('versions', []).push({
      version: '3.6.5',
      mode:  'global',
      copyright: '© 2020 Denis Pushkarev (zloirock.ru)'
    });
    });

    var id = 0;
    var postfix = Math.random();

    var uid = function (key) {
      return 'Symbol(' + String(key === undefined ? '' : key) + ')_' + (++id + postfix).toString(36);
    };

    var keys = shared('keys');

    var sharedKey = function (key) {
      return keys[key] || (keys[key] = uid(key));
    };

    var hiddenKeys = {};

    var WeakMap$2 = global_1.WeakMap;
    var set, get, has$1;

    var enforce = function (it) {
      return has$1(it) ? get(it) : set(it, {});
    };

    var getterFor = function (TYPE) {
      return function (it) {
        var state;
        if (!isObject(it) || (state = get(it)).type !== TYPE) {
          throw TypeError('Incompatible receiver, ' + TYPE + ' required');
        } return state;
      };
    };

    if (nativeWeakMap) {
      var store$1 = new WeakMap$2();
      var wmget = store$1.get;
      var wmhas = store$1.has;
      var wmset = store$1.set;
      set = function (it, metadata) {
        wmset.call(store$1, it, metadata);
        return metadata;
      };
      get = function (it) {
        return wmget.call(store$1, it) || {};
      };
      has$1 = function (it) {
        return wmhas.call(store$1, it);
      };
    } else {
      var STATE = sharedKey('state');
      hiddenKeys[STATE] = true;
      set = function (it, metadata) {
        createNonEnumerableProperty(it, STATE, metadata);
        return metadata;
      };
      get = function (it) {
        return has(it, STATE) ? it[STATE] : {};
      };
      has$1 = function (it) {
        return has(it, STATE);
      };
    }

    var internalState = {
      set: set,
      get: get,
      has: has$1,
      enforce: enforce,
      getterFor: getterFor
    };

    var redefine = createCommonjsModule(function (module) {
    var getInternalState = internalState.get;
    var enforceInternalState = internalState.enforce;
    var TEMPLATE = String(String).split('String');

    (module.exports = function (O, key, value, options) {
      var unsafe = options ? !!options.unsafe : false;
      var simple = options ? !!options.enumerable : false;
      var noTargetGet = options ? !!options.noTargetGet : false;
      if (typeof value == 'function') {
        if (typeof key == 'string' && !has(value, 'name')) createNonEnumerableProperty(value, 'name', key);
        enforceInternalState(value).source = TEMPLATE.join(typeof key == 'string' ? key : '');
      }
      if (O === global_1) {
        if (simple) O[key] = value;
        else setGlobal(key, value);
        return;
      } else if (!unsafe) {
        delete O[key];
      } else if (!noTargetGet && O[key]) {
        simple = true;
      }
      if (simple) O[key] = value;
      else createNonEnumerableProperty(O, key, value);
    // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
    })(Function.prototype, 'toString', function toString() {
      return typeof this == 'function' && getInternalState(this).source || inspectSource(this);
    });
    });

    var path = global_1;

    var aFunction = function (variable) {
      return typeof variable == 'function' ? variable : undefined;
    };

    var getBuiltIn = function (namespace, method) {
      return arguments.length < 2 ? aFunction(path[namespace]) || aFunction(global_1[namespace])
        : path[namespace] && path[namespace][method] || global_1[namespace] && global_1[namespace][method];
    };

    var ceil = Math.ceil;
    var floor = Math.floor;

    // `ToInteger` abstract operation
    // https://tc39.github.io/ecma262/#sec-tointeger
    var toInteger = function (argument) {
      return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor : ceil)(argument);
    };

    var min = Math.min;

    // `ToLength` abstract operation
    // https://tc39.github.io/ecma262/#sec-tolength
    var toLength = function (argument) {
      return argument > 0 ? min(toInteger(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
    };

    var max = Math.max;
    var min$1 = Math.min;

    // Helper for a popular repeating case of the spec:
    // Let integer be ? ToInteger(index).
    // If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
    var toAbsoluteIndex = function (index, length) {
      var integer = toInteger(index);
      return integer < 0 ? max(integer + length, 0) : min$1(integer, length);
    };

    // `Array.prototype.{ indexOf, includes }` methods implementation
    var createMethod = function (IS_INCLUDES) {
      return function ($this, el, fromIndex) {
        var O = toIndexedObject($this);
        var length = toLength(O.length);
        var index = toAbsoluteIndex(fromIndex, length);
        var value;
        // Array#includes uses SameValueZero equality algorithm
        // eslint-disable-next-line no-self-compare
        if (IS_INCLUDES && el != el) while (length > index) {
          value = O[index++];
          // eslint-disable-next-line no-self-compare
          if (value != value) return true;
        // Array#indexOf ignores holes, Array#includes - not
        } else for (;length > index; index++) {
          if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
        } return !IS_INCLUDES && -1;
      };
    };

    var arrayIncludes = {
      // `Array.prototype.includes` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.includes
      includes: createMethod(true),
      // `Array.prototype.indexOf` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.indexof
      indexOf: createMethod(false)
    };

    var indexOf = arrayIncludes.indexOf;


    var objectKeysInternal = function (object, names) {
      var O = toIndexedObject(object);
      var i = 0;
      var result = [];
      var key;
      for (key in O) !has(hiddenKeys, key) && has(O, key) && result.push(key);
      // Don't enum bug & hidden keys
      while (names.length > i) if (has(O, key = names[i++])) {
        ~indexOf(result, key) || result.push(key);
      }
      return result;
    };

    // IE8- don't enum bug keys
    var enumBugKeys = [
      'constructor',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
      'toString',
      'valueOf'
    ];

    var hiddenKeys$1 = enumBugKeys.concat('length', 'prototype');

    // `Object.getOwnPropertyNames` method
    // https://tc39.github.io/ecma262/#sec-object.getownpropertynames
    var f$3 = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
      return objectKeysInternal(O, hiddenKeys$1);
    };

    var objectGetOwnPropertyNames = {
    	f: f$3
    };

    var f$4 = Object.getOwnPropertySymbols;

    var objectGetOwnPropertySymbols = {
    	f: f$4
    };

    // all object keys, includes non-enumerable and symbols
    var ownKeys = getBuiltIn('Reflect', 'ownKeys') || function ownKeys(it) {
      var keys = objectGetOwnPropertyNames.f(anObject(it));
      var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
      return getOwnPropertySymbols ? keys.concat(getOwnPropertySymbols(it)) : keys;
    };

    var copyConstructorProperties = function (target, source) {
      var keys = ownKeys(source);
      var defineProperty = objectDefineProperty.f;
      var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!has(target, key)) defineProperty(target, key, getOwnPropertyDescriptor(source, key));
      }
    };

    var replacement = /#|\.prototype\./;

    var isForced = function (feature, detection) {
      var value = data[normalize(feature)];
      return value == POLYFILL ? true
        : value == NATIVE ? false
        : typeof detection == 'function' ? fails(detection)
        : !!detection;
    };

    var normalize = isForced.normalize = function (string) {
      return String(string).replace(replacement, '.').toLowerCase();
    };

    var data = isForced.data = {};
    var NATIVE = isForced.NATIVE = 'N';
    var POLYFILL = isForced.POLYFILL = 'P';

    var isForced_1 = isForced;

    var getOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;






    /*
      options.target      - name of the target object
      options.global      - target is the global object
      options.stat        - export as static methods of target
      options.proto       - export as prototype methods of target
      options.real        - real prototype method for the `pure` version
      options.forced      - export even if the native feature is available
      options.bind        - bind methods to the target, required for the `pure` version
      options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
      options.unsafe      - use the simple assignment of property instead of delete + defineProperty
      options.sham        - add a flag to not completely full polyfills
      options.enumerable  - export as enumerable property
      options.noTargetGet - prevent calling a getter on target
    */
    var _export = function (options, source) {
      var TARGET = options.target;
      var GLOBAL = options.global;
      var STATIC = options.stat;
      var FORCED, target, key, targetProperty, sourceProperty, descriptor;
      if (GLOBAL) {
        target = global_1;
      } else if (STATIC) {
        target = global_1[TARGET] || setGlobal(TARGET, {});
      } else {
        target = (global_1[TARGET] || {}).prototype;
      }
      if (target) for (key in source) {
        sourceProperty = source[key];
        if (options.noTargetGet) {
          descriptor = getOwnPropertyDescriptor$1(target, key);
          targetProperty = descriptor && descriptor.value;
        } else targetProperty = target[key];
        FORCED = isForced_1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
        // contained in target
        if (!FORCED && targetProperty !== undefined) {
          if (typeof sourceProperty === typeof targetProperty) continue;
          copyConstructorProperties(sourceProperty, targetProperty);
        }
        // add a flag to not completely full polyfills
        if (options.sham || (targetProperty && targetProperty.sham)) {
          createNonEnumerableProperty(sourceProperty, 'sham', true);
        }
        // extend global
        redefine(target, key, sourceProperty, options);
      }
    };

    var aFunction$1 = function (it) {
      if (typeof it != 'function') {
        throw TypeError(String(it) + ' is not a function');
      } return it;
    };

    // optional / simple context binding
    var functionBindContext = function (fn, that, length) {
      aFunction$1(fn);
      if (that === undefined) return fn;
      switch (length) {
        case 0: return function () {
          return fn.call(that);
        };
        case 1: return function (a) {
          return fn.call(that, a);
        };
        case 2: return function (a, b) {
          return fn.call(that, a, b);
        };
        case 3: return function (a, b, c) {
          return fn.call(that, a, b, c);
        };
      }
      return function (/* ...args */) {
        return fn.apply(that, arguments);
      };
    };

    // `ToObject` abstract operation
    // https://tc39.github.io/ecma262/#sec-toobject
    var toObject = function (argument) {
      return Object(requireObjectCoercible(argument));
    };

    // `IsArray` abstract operation
    // https://tc39.github.io/ecma262/#sec-isarray
    var isArray = Array.isArray || function isArray(arg) {
      return classofRaw(arg) == 'Array';
    };

    var nativeSymbol = !!Object.getOwnPropertySymbols && !fails(function () {
      // Chrome 38 Symbol has incorrect toString conversion
      // eslint-disable-next-line no-undef
      return !String(Symbol());
    });

    var useSymbolAsUid = nativeSymbol
      // eslint-disable-next-line no-undef
      && !Symbol.sham
      // eslint-disable-next-line no-undef
      && typeof Symbol.iterator == 'symbol';

    var WellKnownSymbolsStore = shared('wks');
    var Symbol$1 = global_1.Symbol;
    var createWellKnownSymbol = useSymbolAsUid ? Symbol$1 : Symbol$1 && Symbol$1.withoutSetter || uid;

    var wellKnownSymbol = function (name) {
      if (!has(WellKnownSymbolsStore, name)) {
        if (nativeSymbol && has(Symbol$1, name)) WellKnownSymbolsStore[name] = Symbol$1[name];
        else WellKnownSymbolsStore[name] = createWellKnownSymbol('Symbol.' + name);
      } return WellKnownSymbolsStore[name];
    };

    var SPECIES = wellKnownSymbol('species');

    // `ArraySpeciesCreate` abstract operation
    // https://tc39.github.io/ecma262/#sec-arrayspeciescreate
    var arraySpeciesCreate = function (originalArray, length) {
      var C;
      if (isArray(originalArray)) {
        C = originalArray.constructor;
        // cross-realm fallback
        if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
        else if (isObject(C)) {
          C = C[SPECIES];
          if (C === null) C = undefined;
        }
      } return new (C === undefined ? Array : C)(length === 0 ? 0 : length);
    };

    var push = [].push;

    // `Array.prototype.{ forEach, map, filter, some, every, find, findIndex }` methods implementation
    var createMethod$1 = function (TYPE) {
      var IS_MAP = TYPE == 1;
      var IS_FILTER = TYPE == 2;
      var IS_SOME = TYPE == 3;
      var IS_EVERY = TYPE == 4;
      var IS_FIND_INDEX = TYPE == 6;
      var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
      return function ($this, callbackfn, that, specificCreate) {
        var O = toObject($this);
        var self = indexedObject(O);
        var boundFunction = functionBindContext(callbackfn, that, 3);
        var length = toLength(self.length);
        var index = 0;
        var create = specificCreate || arraySpeciesCreate;
        var target = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined;
        var value, result;
        for (;length > index; index++) if (NO_HOLES || index in self) {
          value = self[index];
          result = boundFunction(value, index, O);
          if (TYPE) {
            if (IS_MAP) target[index] = result; // map
            else if (result) switch (TYPE) {
              case 3: return true;              // some
              case 5: return value;             // find
              case 6: return index;             // findIndex
              case 2: push.call(target, value); // filter
            } else if (IS_EVERY) return false;  // every
          }
        }
        return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
      };
    };

    var arrayIteration = {
      // `Array.prototype.forEach` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.foreach
      forEach: createMethod$1(0),
      // `Array.prototype.map` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.map
      map: createMethod$1(1),
      // `Array.prototype.filter` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.filter
      filter: createMethod$1(2),
      // `Array.prototype.some` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.some
      some: createMethod$1(3),
      // `Array.prototype.every` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.every
      every: createMethod$1(4),
      // `Array.prototype.find` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.find
      find: createMethod$1(5),
      // `Array.prototype.findIndex` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
      findIndex: createMethod$1(6)
    };

    var arrayMethodIsStrict = function (METHOD_NAME, argument) {
      var method = [][METHOD_NAME];
      return !!method && fails(function () {
        // eslint-disable-next-line no-useless-call,no-throw-literal
        method.call(null, argument || function () { throw 1; }, 1);
      });
    };

    var defineProperty = Object.defineProperty;
    var cache = {};

    var thrower = function (it) { throw it; };

    var arrayMethodUsesToLength = function (METHOD_NAME, options) {
      if (has(cache, METHOD_NAME)) return cache[METHOD_NAME];
      if (!options) options = {};
      var method = [][METHOD_NAME];
      var ACCESSORS = has(options, 'ACCESSORS') ? options.ACCESSORS : false;
      var argument0 = has(options, 0) ? options[0] : thrower;
      var argument1 = has(options, 1) ? options[1] : undefined;

      return cache[METHOD_NAME] = !!method && !fails(function () {
        if (ACCESSORS && !descriptors) return true;
        var O = { length: -1 };

        if (ACCESSORS) defineProperty(O, 1, { enumerable: true, get: thrower });
        else O[1] = 1;

        method.call(O, argument0, argument1);
      });
    };

    var $forEach = arrayIteration.forEach;



    var STRICT_METHOD = arrayMethodIsStrict('forEach');
    var USES_TO_LENGTH = arrayMethodUsesToLength('forEach');

    // `Array.prototype.forEach` method implementation
    // https://tc39.github.io/ecma262/#sec-array.prototype.foreach
    var arrayForEach = (!STRICT_METHOD || !USES_TO_LENGTH) ? function forEach(callbackfn /* , thisArg */) {
      return $forEach(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    } : [].forEach;

    // `Array.prototype.forEach` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.foreach
    _export({ target: 'Array', proto: true, forced: [].forEach != arrayForEach }, {
      forEach: arrayForEach
    });

    // iterable DOM collections
    // flag - `iterable` interface - 'entries', 'keys', 'values', 'forEach' methods
    var domIterables = {
      CSSRuleList: 0,
      CSSStyleDeclaration: 0,
      CSSValueList: 0,
      ClientRectList: 0,
      DOMRectList: 0,
      DOMStringList: 0,
      DOMTokenList: 1,
      DataTransferItemList: 0,
      FileList: 0,
      HTMLAllCollection: 0,
      HTMLCollection: 0,
      HTMLFormElement: 0,
      HTMLSelectElement: 0,
      MediaList: 0,
      MimeTypeArray: 0,
      NamedNodeMap: 0,
      NodeList: 1,
      PaintRequestList: 0,
      Plugin: 0,
      PluginArray: 0,
      SVGLengthList: 0,
      SVGNumberList: 0,
      SVGPathSegList: 0,
      SVGPointList: 0,
      SVGStringList: 0,
      SVGTransformList: 0,
      SourceBufferList: 0,
      StyleSheetList: 0,
      TextTrackCueList: 0,
      TextTrackList: 0,
      TouchList: 0
    };

    for (var COLLECTION_NAME in domIterables) {
      var Collection = global_1[COLLECTION_NAME];
      var CollectionPrototype = Collection && Collection.prototype;
      // some Chrome versions have non-configurable methods on DOMTokenList
      if (CollectionPrototype && CollectionPrototype.forEach !== arrayForEach) try {
        createNonEnumerableProperty(CollectionPrototype, 'forEach', arrayForEach);
      } catch (error) {
        CollectionPrototype.forEach = arrayForEach;
      }
    }

    var canUseDOM = !!(
      typeof window !== 'undefined' &&
      window.document &&
      window.document.createElement
    );

    var canUseDom = canUseDOM;

    var engineUserAgent = getBuiltIn('navigator', 'userAgent') || '';

    var process$1 = global_1.process;
    var versions = process$1 && process$1.versions;
    var v8 = versions && versions.v8;
    var match, version;

    if (v8) {
      match = v8.split('.');
      version = match[0] + match[1];
    } else if (engineUserAgent) {
      match = engineUserAgent.match(/Edge\/(\d+)/);
      if (!match || match[1] >= 74) {
        match = engineUserAgent.match(/Chrome\/(\d+)/);
        if (match) version = match[1];
      }
    }

    var engineV8Version = version && +version;

    var SPECIES$1 = wellKnownSymbol('species');

    var arrayMethodHasSpeciesSupport = function (METHOD_NAME) {
      // We can't use this feature detection in V8 since it causes
      // deoptimization and serious performance degradation
      // https://github.com/zloirock/core-js/issues/677
      return engineV8Version >= 51 || !fails(function () {
        var array = [];
        var constructor = array.constructor = {};
        constructor[SPECIES$1] = function () {
          return { foo: 1 };
        };
        return array[METHOD_NAME](Boolean).foo !== 1;
      });
    };

    var $filter = arrayIteration.filter;



    var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('filter');
    // Edge 14- issue
    var USES_TO_LENGTH$1 = arrayMethodUsesToLength('filter');

    // `Array.prototype.filter` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.filter
    // with adding support of @@species
    _export({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT || !USES_TO_LENGTH$1 }, {
      filter: function filter(callbackfn /* , thisArg */) {
        return $filter(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
      }
    });

    // `Object.keys` method
    // https://tc39.github.io/ecma262/#sec-object.keys
    var objectKeys = Object.keys || function keys(O) {
      return objectKeysInternal(O, enumBugKeys);
    };

    // `Object.defineProperties` method
    // https://tc39.github.io/ecma262/#sec-object.defineproperties
    var objectDefineProperties = descriptors ? Object.defineProperties : function defineProperties(O, Properties) {
      anObject(O);
      var keys = objectKeys(Properties);
      var length = keys.length;
      var index = 0;
      var key;
      while (length > index) objectDefineProperty.f(O, key = keys[index++], Properties[key]);
      return O;
    };

    var html = getBuiltIn('document', 'documentElement');

    var GT = '>';
    var LT = '<';
    var PROTOTYPE = 'prototype';
    var SCRIPT = 'script';
    var IE_PROTO = sharedKey('IE_PROTO');

    var EmptyConstructor = function () { /* empty */ };

    var scriptTag = function (content) {
      return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
    };

    // Create object with fake `null` prototype: use ActiveX Object with cleared prototype
    var NullProtoObjectViaActiveX = function (activeXDocument) {
      activeXDocument.write(scriptTag(''));
      activeXDocument.close();
      var temp = activeXDocument.parentWindow.Object;
      activeXDocument = null; // avoid memory leak
      return temp;
    };

    // Create object with fake `null` prototype: use iframe Object with cleared prototype
    var NullProtoObjectViaIFrame = function () {
      // Thrash, waste and sodomy: IE GC bug
      var iframe = documentCreateElement('iframe');
      var JS = 'java' + SCRIPT + ':';
      var iframeDocument;
      iframe.style.display = 'none';
      html.appendChild(iframe);
      // https://github.com/zloirock/core-js/issues/475
      iframe.src = String(JS);
      iframeDocument = iframe.contentWindow.document;
      iframeDocument.open();
      iframeDocument.write(scriptTag('document.F=Object'));
      iframeDocument.close();
      return iframeDocument.F;
    };

    // Check for document.domain and active x support
    // No need to use active x approach when document.domain is not set
    // see https://github.com/es-shims/es5-shim/issues/150
    // variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
    // avoid IE GC bug
    var activeXDocument;
    var NullProtoObject = function () {
      try {
        /* global ActiveXObject */
        activeXDocument = document.domain && new ActiveXObject('htmlfile');
      } catch (error) { /* ignore */ }
      NullProtoObject = activeXDocument ? NullProtoObjectViaActiveX(activeXDocument) : NullProtoObjectViaIFrame();
      var length = enumBugKeys.length;
      while (length--) delete NullProtoObject[PROTOTYPE][enumBugKeys[length]];
      return NullProtoObject();
    };

    hiddenKeys[IE_PROTO] = true;

    // `Object.create` method
    // https://tc39.github.io/ecma262/#sec-object.create
    var objectCreate = Object.create || function create(O, Properties) {
      var result;
      if (O !== null) {
        EmptyConstructor[PROTOTYPE] = anObject(O);
        result = new EmptyConstructor();
        EmptyConstructor[PROTOTYPE] = null;
        // add "__proto__" for Object.getPrototypeOf polyfill
        result[IE_PROTO] = O;
      } else result = NullProtoObject();
      return Properties === undefined ? result : objectDefineProperties(result, Properties);
    };

    var UNSCOPABLES = wellKnownSymbol('unscopables');
    var ArrayPrototype = Array.prototype;

    // Array.prototype[@@unscopables]
    // https://tc39.github.io/ecma262/#sec-array.prototype-@@unscopables
    if (ArrayPrototype[UNSCOPABLES] == undefined) {
      objectDefineProperty.f(ArrayPrototype, UNSCOPABLES, {
        configurable: true,
        value: objectCreate(null)
      });
    }

    // add a key to Array.prototype[@@unscopables]
    var addToUnscopables = function (key) {
      ArrayPrototype[UNSCOPABLES][key] = true;
    };

    var iterators = {};

    var correctPrototypeGetter = !fails(function () {
      function F() { /* empty */ }
      F.prototype.constructor = null;
      return Object.getPrototypeOf(new F()) !== F.prototype;
    });

    var IE_PROTO$1 = sharedKey('IE_PROTO');
    var ObjectPrototype = Object.prototype;

    // `Object.getPrototypeOf` method
    // https://tc39.github.io/ecma262/#sec-object.getprototypeof
    var objectGetPrototypeOf = correctPrototypeGetter ? Object.getPrototypeOf : function (O) {
      O = toObject(O);
      if (has(O, IE_PROTO$1)) return O[IE_PROTO$1];
      if (typeof O.constructor == 'function' && O instanceof O.constructor) {
        return O.constructor.prototype;
      } return O instanceof Object ? ObjectPrototype : null;
    };

    var ITERATOR = wellKnownSymbol('iterator');
    var BUGGY_SAFARI_ITERATORS = false;

    var returnThis = function () { return this; };

    // `%IteratorPrototype%` object
    // https://tc39.github.io/ecma262/#sec-%iteratorprototype%-object
    var IteratorPrototype, PrototypeOfArrayIteratorPrototype, arrayIterator;

    if ([].keys) {
      arrayIterator = [].keys();
      // Safari 8 has buggy iterators w/o `next`
      if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS = true;
      else {
        PrototypeOfArrayIteratorPrototype = objectGetPrototypeOf(objectGetPrototypeOf(arrayIterator));
        if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype = PrototypeOfArrayIteratorPrototype;
      }
    }

    if (IteratorPrototype == undefined) IteratorPrototype = {};

    // 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
    if ( !has(IteratorPrototype, ITERATOR)) {
      createNonEnumerableProperty(IteratorPrototype, ITERATOR, returnThis);
    }

    var iteratorsCore = {
      IteratorPrototype: IteratorPrototype,
      BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS
    };

    var defineProperty$1 = objectDefineProperty.f;



    var TO_STRING_TAG = wellKnownSymbol('toStringTag');

    var setToStringTag = function (it, TAG, STATIC) {
      if (it && !has(it = STATIC ? it : it.prototype, TO_STRING_TAG)) {
        defineProperty$1(it, TO_STRING_TAG, { configurable: true, value: TAG });
      }
    };

    var IteratorPrototype$1 = iteratorsCore.IteratorPrototype;





    var returnThis$1 = function () { return this; };

    var createIteratorConstructor = function (IteratorConstructor, NAME, next) {
      var TO_STRING_TAG = NAME + ' Iterator';
      IteratorConstructor.prototype = objectCreate(IteratorPrototype$1, { next: createPropertyDescriptor(1, next) });
      setToStringTag(IteratorConstructor, TO_STRING_TAG, false);
      iterators[TO_STRING_TAG] = returnThis$1;
      return IteratorConstructor;
    };

    var aPossiblePrototype = function (it) {
      if (!isObject(it) && it !== null) {
        throw TypeError("Can't set " + String(it) + ' as a prototype');
      } return it;
    };

    // `Object.setPrototypeOf` method
    // https://tc39.github.io/ecma262/#sec-object.setprototypeof
    // Works with __proto__ only. Old v8 can't work with null proto objects.
    /* eslint-disable no-proto */
    var objectSetPrototypeOf = Object.setPrototypeOf || ('__proto__' in {} ? function () {
      var CORRECT_SETTER = false;
      var test = {};
      var setter;
      try {
        setter = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').set;
        setter.call(test, []);
        CORRECT_SETTER = test instanceof Array;
      } catch (error) { /* empty */ }
      return function setPrototypeOf(O, proto) {
        anObject(O);
        aPossiblePrototype(proto);
        if (CORRECT_SETTER) setter.call(O, proto);
        else O.__proto__ = proto;
        return O;
      };
    }() : undefined);

    var IteratorPrototype$2 = iteratorsCore.IteratorPrototype;
    var BUGGY_SAFARI_ITERATORS$1 = iteratorsCore.BUGGY_SAFARI_ITERATORS;
    var ITERATOR$1 = wellKnownSymbol('iterator');
    var KEYS = 'keys';
    var VALUES = 'values';
    var ENTRIES = 'entries';

    var returnThis$2 = function () { return this; };

    var defineIterator = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
      createIteratorConstructor(IteratorConstructor, NAME, next);

      var getIterationMethod = function (KIND) {
        if (KIND === DEFAULT && defaultIterator) return defaultIterator;
        if (!BUGGY_SAFARI_ITERATORS$1 && KIND in IterablePrototype) return IterablePrototype[KIND];
        switch (KIND) {
          case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
          case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
          case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
        } return function () { return new IteratorConstructor(this); };
      };

      var TO_STRING_TAG = NAME + ' Iterator';
      var INCORRECT_VALUES_NAME = false;
      var IterablePrototype = Iterable.prototype;
      var nativeIterator = IterablePrototype[ITERATOR$1]
        || IterablePrototype['@@iterator']
        || DEFAULT && IterablePrototype[DEFAULT];
      var defaultIterator = !BUGGY_SAFARI_ITERATORS$1 && nativeIterator || getIterationMethod(DEFAULT);
      var anyNativeIterator = NAME == 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
      var CurrentIteratorPrototype, methods, KEY;

      // fix native
      if (anyNativeIterator) {
        CurrentIteratorPrototype = objectGetPrototypeOf(anyNativeIterator.call(new Iterable()));
        if (IteratorPrototype$2 !== Object.prototype && CurrentIteratorPrototype.next) {
          if ( objectGetPrototypeOf(CurrentIteratorPrototype) !== IteratorPrototype$2) {
            if (objectSetPrototypeOf) {
              objectSetPrototypeOf(CurrentIteratorPrototype, IteratorPrototype$2);
            } else if (typeof CurrentIteratorPrototype[ITERATOR$1] != 'function') {
              createNonEnumerableProperty(CurrentIteratorPrototype, ITERATOR$1, returnThis$2);
            }
          }
          // Set @@toStringTag to native iterators
          setToStringTag(CurrentIteratorPrototype, TO_STRING_TAG, true);
        }
      }

      // fix Array#{values, @@iterator}.name in V8 / FF
      if (DEFAULT == VALUES && nativeIterator && nativeIterator.name !== VALUES) {
        INCORRECT_VALUES_NAME = true;
        defaultIterator = function values() { return nativeIterator.call(this); };
      }

      // define iterator
      if ( IterablePrototype[ITERATOR$1] !== defaultIterator) {
        createNonEnumerableProperty(IterablePrototype, ITERATOR$1, defaultIterator);
      }
      iterators[NAME] = defaultIterator;

      // export additional methods
      if (DEFAULT) {
        methods = {
          values: getIterationMethod(VALUES),
          keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
          entries: getIterationMethod(ENTRIES)
        };
        if (FORCED) for (KEY in methods) {
          if (BUGGY_SAFARI_ITERATORS$1 || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
            redefine(IterablePrototype, KEY, methods[KEY]);
          }
        } else _export({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS$1 || INCORRECT_VALUES_NAME }, methods);
      }

      return methods;
    };

    var ARRAY_ITERATOR = 'Array Iterator';
    var setInternalState = internalState.set;
    var getInternalState = internalState.getterFor(ARRAY_ITERATOR);

    // `Array.prototype.entries` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.entries
    // `Array.prototype.keys` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.keys
    // `Array.prototype.values` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.values
    // `Array.prototype[@@iterator]` method
    // https://tc39.github.io/ecma262/#sec-array.prototype-@@iterator
    // `CreateArrayIterator` internal method
    // https://tc39.github.io/ecma262/#sec-createarrayiterator
    var es_array_iterator = defineIterator(Array, 'Array', function (iterated, kind) {
      setInternalState(this, {
        type: ARRAY_ITERATOR,
        target: toIndexedObject(iterated), // target
        index: 0,                          // next index
        kind: kind                         // kind
      });
    // `%ArrayIteratorPrototype%.next` method
    // https://tc39.github.io/ecma262/#sec-%arrayiteratorprototype%.next
    }, function () {
      var state = getInternalState(this);
      var target = state.target;
      var kind = state.kind;
      var index = state.index++;
      if (!target || index >= target.length) {
        state.target = undefined;
        return { value: undefined, done: true };
      }
      if (kind == 'keys') return { value: index, done: false };
      if (kind == 'values') return { value: target[index], done: false };
      return { value: [index, target[index]], done: false };
    }, 'values');

    // argumentsList[@@iterator] is %ArrayProto_values%
    // https://tc39.github.io/ecma262/#sec-createunmappedargumentsobject
    // https://tc39.github.io/ecma262/#sec-createmappedargumentsobject
    iterators.Arguments = iterators.Array;

    // https://tc39.github.io/ecma262/#sec-array.prototype-@@unscopables
    addToUnscopables('keys');
    addToUnscopables('values');
    addToUnscopables('entries');

    var nativeAssign = Object.assign;
    var defineProperty$2 = Object.defineProperty;

    // `Object.assign` method
    // https://tc39.github.io/ecma262/#sec-object.assign
    var objectAssign = !nativeAssign || fails(function () {
      // should have correct order of operations (Edge bug)
      if (descriptors && nativeAssign({ b: 1 }, nativeAssign(defineProperty$2({}, 'a', {
        enumerable: true,
        get: function () {
          defineProperty$2(this, 'b', {
            value: 3,
            enumerable: false
          });
        }
      }), { b: 2 })).b !== 1) return true;
      // should work with symbols and should have deterministic property order (V8 bug)
      var A = {};
      var B = {};
      // eslint-disable-next-line no-undef
      var symbol = Symbol();
      var alphabet = 'abcdefghijklmnopqrst';
      A[symbol] = 7;
      alphabet.split('').forEach(function (chr) { B[chr] = chr; });
      return nativeAssign({}, A)[symbol] != 7 || objectKeys(nativeAssign({}, B)).join('') != alphabet;
    }) ? function assign(target, source) { // eslint-disable-line no-unused-vars
      var T = toObject(target);
      var argumentsLength = arguments.length;
      var index = 1;
      var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
      var propertyIsEnumerable = objectPropertyIsEnumerable.f;
      while (argumentsLength > index) {
        var S = indexedObject(arguments[index++]);
        var keys = getOwnPropertySymbols ? objectKeys(S).concat(getOwnPropertySymbols(S)) : objectKeys(S);
        var length = keys.length;
        var j = 0;
        var key;
        while (length > j) {
          key = keys[j++];
          if (!descriptors || propertyIsEnumerable.call(S, key)) T[key] = S[key];
        }
      } return T;
    } : nativeAssign;

    // `Object.assign` method
    // https://tc39.github.io/ecma262/#sec-object.assign
    _export({ target: 'Object', stat: true, forced: Object.assign !== objectAssign }, {
      assign: objectAssign
    });

    var TO_STRING_TAG$1 = wellKnownSymbol('toStringTag');
    var test = {};

    test[TO_STRING_TAG$1] = 'z';

    var toStringTagSupport = String(test) === '[object z]';

    var TO_STRING_TAG$2 = wellKnownSymbol('toStringTag');
    // ES3 wrong here
    var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) == 'Arguments';

    // fallback for IE11 Script Access Denied error
    var tryGet = function (it, key) {
      try {
        return it[key];
      } catch (error) { /* empty */ }
    };

    // getting tag from ES6+ `Object.prototype.toString`
    var classof = toStringTagSupport ? classofRaw : function (it) {
      var O, tag, result;
      return it === undefined ? 'Undefined' : it === null ? 'Null'
        // @@toStringTag case
        : typeof (tag = tryGet(O = Object(it), TO_STRING_TAG$2)) == 'string' ? tag
        // builtinTag case
        : CORRECT_ARGUMENTS ? classofRaw(O)
        // ES3 arguments fallback
        : (result = classofRaw(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : result;
    };

    // `Object.prototype.toString` method implementation
    // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
    var objectToString = toStringTagSupport ? {}.toString : function toString() {
      return '[object ' + classof(this) + ']';
    };

    // `Object.prototype.toString` method
    // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
    if (!toStringTagSupport) {
      redefine(Object.prototype, 'toString', objectToString, { unsafe: true });
    }

    // `String.prototype.{ codePointAt, at }` methods implementation
    var createMethod$2 = function (CONVERT_TO_STRING) {
      return function ($this, pos) {
        var S = String(requireObjectCoercible($this));
        var position = toInteger(pos);
        var size = S.length;
        var first, second;
        if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
        first = S.charCodeAt(position);
        return first < 0xD800 || first > 0xDBFF || position + 1 === size
          || (second = S.charCodeAt(position + 1)) < 0xDC00 || second > 0xDFFF
            ? CONVERT_TO_STRING ? S.charAt(position) : first
            : CONVERT_TO_STRING ? S.slice(position, position + 2) : (first - 0xD800 << 10) + (second - 0xDC00) + 0x10000;
      };
    };

    var stringMultibyte = {
      // `String.prototype.codePointAt` method
      // https://tc39.github.io/ecma262/#sec-string.prototype.codepointat
      codeAt: createMethod$2(false),
      // `String.prototype.at` method
      // https://github.com/mathiasbynens/String.prototype.at
      charAt: createMethod$2(true)
    };

    var charAt = stringMultibyte.charAt;



    var STRING_ITERATOR = 'String Iterator';
    var setInternalState$1 = internalState.set;
    var getInternalState$1 = internalState.getterFor(STRING_ITERATOR);

    // `String.prototype[@@iterator]` method
    // https://tc39.github.io/ecma262/#sec-string.prototype-@@iterator
    defineIterator(String, 'String', function (iterated) {
      setInternalState$1(this, {
        type: STRING_ITERATOR,
        string: String(iterated),
        index: 0
      });
    // `%StringIteratorPrototype%.next` method
    // https://tc39.github.io/ecma262/#sec-%stringiteratorprototype%.next
    }, function next() {
      var state = getInternalState$1(this);
      var string = state.string;
      var index = state.index;
      var point;
      if (index >= string.length) return { value: undefined, done: true };
      point = charAt(string, index);
      state.index += point.length;
      return { value: point, done: false };
    });

    var redefineAll = function (target, src, options) {
      for (var key in src) redefine(target, key, src[key], options);
      return target;
    };

    var freezing = !fails(function () {
      return Object.isExtensible(Object.preventExtensions({}));
    });

    var internalMetadata = createCommonjsModule(function (module) {
    var defineProperty = objectDefineProperty.f;



    var METADATA = uid('meta');
    var id = 0;

    var isExtensible = Object.isExtensible || function () {
      return true;
    };

    var setMetadata = function (it) {
      defineProperty(it, METADATA, { value: {
        objectID: 'O' + ++id, // object ID
        weakData: {}          // weak collections IDs
      } });
    };

    var fastKey = function (it, create) {
      // return a primitive with prefix
      if (!isObject(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
      if (!has(it, METADATA)) {
        // can't set metadata to uncaught frozen object
        if (!isExtensible(it)) return 'F';
        // not necessary to add metadata
        if (!create) return 'E';
        // add missing metadata
        setMetadata(it);
      // return object ID
      } return it[METADATA].objectID;
    };

    var getWeakData = function (it, create) {
      if (!has(it, METADATA)) {
        // can't set metadata to uncaught frozen object
        if (!isExtensible(it)) return true;
        // not necessary to add metadata
        if (!create) return false;
        // add missing metadata
        setMetadata(it);
      // return the store of weak collections IDs
      } return it[METADATA].weakData;
    };

    // add metadata on freeze-family methods calling
    var onFreeze = function (it) {
      if (freezing && meta.REQUIRED && isExtensible(it) && !has(it, METADATA)) setMetadata(it);
      return it;
    };

    var meta = module.exports = {
      REQUIRED: false,
      fastKey: fastKey,
      getWeakData: getWeakData,
      onFreeze: onFreeze
    };

    hiddenKeys[METADATA] = true;
    });

    var ITERATOR$2 = wellKnownSymbol('iterator');
    var ArrayPrototype$1 = Array.prototype;

    // check on default Array iterator
    var isArrayIteratorMethod = function (it) {
      return it !== undefined && (iterators.Array === it || ArrayPrototype$1[ITERATOR$2] === it);
    };

    var ITERATOR$3 = wellKnownSymbol('iterator');

    var getIteratorMethod = function (it) {
      if (it != undefined) return it[ITERATOR$3]
        || it['@@iterator']
        || iterators[classof(it)];
    };

    // call something on iterator step with safe closing on error
    var callWithSafeIterationClosing = function (iterator, fn, value, ENTRIES) {
      try {
        return ENTRIES ? fn(anObject(value)[0], value[1]) : fn(value);
      // 7.4.6 IteratorClose(iterator, completion)
      } catch (error) {
        var returnMethod = iterator['return'];
        if (returnMethod !== undefined) anObject(returnMethod.call(iterator));
        throw error;
      }
    };

    var iterate_1 = createCommonjsModule(function (module) {
    var Result = function (stopped, result) {
      this.stopped = stopped;
      this.result = result;
    };

    var iterate = module.exports = function (iterable, fn, that, AS_ENTRIES, IS_ITERATOR) {
      var boundFunction = functionBindContext(fn, that, AS_ENTRIES ? 2 : 1);
      var iterator, iterFn, index, length, result, next, step;

      if (IS_ITERATOR) {
        iterator = iterable;
      } else {
        iterFn = getIteratorMethod(iterable);
        if (typeof iterFn != 'function') throw TypeError('Target is not iterable');
        // optimisation for array iterators
        if (isArrayIteratorMethod(iterFn)) {
          for (index = 0, length = toLength(iterable.length); length > index; index++) {
            result = AS_ENTRIES
              ? boundFunction(anObject(step = iterable[index])[0], step[1])
              : boundFunction(iterable[index]);
            if (result && result instanceof Result) return result;
          } return new Result(false);
        }
        iterator = iterFn.call(iterable);
      }

      next = iterator.next;
      while (!(step = next.call(iterator)).done) {
        result = callWithSafeIterationClosing(iterator, boundFunction, step.value, AS_ENTRIES);
        if (typeof result == 'object' && result && result instanceof Result) return result;
      } return new Result(false);
    };

    iterate.stop = function (result) {
      return new Result(true, result);
    };
    });

    var anInstance = function (it, Constructor, name) {
      if (!(it instanceof Constructor)) {
        throw TypeError('Incorrect ' + (name ? name + ' ' : '') + 'invocation');
      } return it;
    };

    var ITERATOR$4 = wellKnownSymbol('iterator');
    var SAFE_CLOSING = false;

    try {
      var called = 0;
      var iteratorWithReturn = {
        next: function () {
          return { done: !!called++ };
        },
        'return': function () {
          SAFE_CLOSING = true;
        }
      };
      iteratorWithReturn[ITERATOR$4] = function () {
        return this;
      };
      // eslint-disable-next-line no-throw-literal
      Array.from(iteratorWithReturn, function () { throw 2; });
    } catch (error) { /* empty */ }

    var checkCorrectnessOfIteration = function (exec, SKIP_CLOSING) {
      if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
      var ITERATION_SUPPORT = false;
      try {
        var object = {};
        object[ITERATOR$4] = function () {
          return {
            next: function () {
              return { done: ITERATION_SUPPORT = true };
            }
          };
        };
        exec(object);
      } catch (error) { /* empty */ }
      return ITERATION_SUPPORT;
    };

    // makes subclassing work correct for wrapped built-ins
    var inheritIfRequired = function ($this, dummy, Wrapper) {
      var NewTarget, NewTargetPrototype;
      if (
        // it can work only with native `setPrototypeOf`
        objectSetPrototypeOf &&
        // we haven't completely correct pre-ES6 way for getting `new.target`, so use this
        typeof (NewTarget = dummy.constructor) == 'function' &&
        NewTarget !== Wrapper &&
        isObject(NewTargetPrototype = NewTarget.prototype) &&
        NewTargetPrototype !== Wrapper.prototype
      ) objectSetPrototypeOf($this, NewTargetPrototype);
      return $this;
    };

    var collection = function (CONSTRUCTOR_NAME, wrapper, common) {
      var IS_MAP = CONSTRUCTOR_NAME.indexOf('Map') !== -1;
      var IS_WEAK = CONSTRUCTOR_NAME.indexOf('Weak') !== -1;
      var ADDER = IS_MAP ? 'set' : 'add';
      var NativeConstructor = global_1[CONSTRUCTOR_NAME];
      var NativePrototype = NativeConstructor && NativeConstructor.prototype;
      var Constructor = NativeConstructor;
      var exported = {};

      var fixMethod = function (KEY) {
        var nativeMethod = NativePrototype[KEY];
        redefine(NativePrototype, KEY,
          KEY == 'add' ? function add(value) {
            nativeMethod.call(this, value === 0 ? 0 : value);
            return this;
          } : KEY == 'delete' ? function (key) {
            return IS_WEAK && !isObject(key) ? false : nativeMethod.call(this, key === 0 ? 0 : key);
          } : KEY == 'get' ? function get(key) {
            return IS_WEAK && !isObject(key) ? undefined : nativeMethod.call(this, key === 0 ? 0 : key);
          } : KEY == 'has' ? function has(key) {
            return IS_WEAK && !isObject(key) ? false : nativeMethod.call(this, key === 0 ? 0 : key);
          } : function set(key, value) {
            nativeMethod.call(this, key === 0 ? 0 : key, value);
            return this;
          }
        );
      };

      // eslint-disable-next-line max-len
      if (isForced_1(CONSTRUCTOR_NAME, typeof NativeConstructor != 'function' || !(IS_WEAK || NativePrototype.forEach && !fails(function () {
        new NativeConstructor().entries().next();
      })))) {
        // create collection constructor
        Constructor = common.getConstructor(wrapper, CONSTRUCTOR_NAME, IS_MAP, ADDER);
        internalMetadata.REQUIRED = true;
      } else if (isForced_1(CONSTRUCTOR_NAME, true)) {
        var instance = new Constructor();
        // early implementations not supports chaining
        var HASNT_CHAINING = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance;
        // V8 ~ Chromium 40- weak-collections throws on primitives, but should return false
        var THROWS_ON_PRIMITIVES = fails(function () { instance.has(1); });
        // most early implementations doesn't supports iterables, most modern - not close it correctly
        // eslint-disable-next-line no-new
        var ACCEPT_ITERABLES = checkCorrectnessOfIteration(function (iterable) { new NativeConstructor(iterable); });
        // for early implementations -0 and +0 not the same
        var BUGGY_ZERO = !IS_WEAK && fails(function () {
          // V8 ~ Chromium 42- fails only with 5+ elements
          var $instance = new NativeConstructor();
          var index = 5;
          while (index--) $instance[ADDER](index, index);
          return !$instance.has(-0);
        });

        if (!ACCEPT_ITERABLES) {
          Constructor = wrapper(function (dummy, iterable) {
            anInstance(dummy, Constructor, CONSTRUCTOR_NAME);
            var that = inheritIfRequired(new NativeConstructor(), dummy, Constructor);
            if (iterable != undefined) iterate_1(iterable, that[ADDER], that, IS_MAP);
            return that;
          });
          Constructor.prototype = NativePrototype;
          NativePrototype.constructor = Constructor;
        }

        if (THROWS_ON_PRIMITIVES || BUGGY_ZERO) {
          fixMethod('delete');
          fixMethod('has');
          IS_MAP && fixMethod('get');
        }

        if (BUGGY_ZERO || HASNT_CHAINING) fixMethod(ADDER);

        // weak collections should not contains .clear method
        if (IS_WEAK && NativePrototype.clear) delete NativePrototype.clear;
      }

      exported[CONSTRUCTOR_NAME] = Constructor;
      _export({ global: true, forced: Constructor != NativeConstructor }, exported);

      setToStringTag(Constructor, CONSTRUCTOR_NAME);

      if (!IS_WEAK) common.setStrong(Constructor, CONSTRUCTOR_NAME, IS_MAP);

      return Constructor;
    };

    var getWeakData = internalMetadata.getWeakData;








    var setInternalState$2 = internalState.set;
    var internalStateGetterFor = internalState.getterFor;
    var find = arrayIteration.find;
    var findIndex = arrayIteration.findIndex;
    var id$1 = 0;

    // fallback for uncaught frozen keys
    var uncaughtFrozenStore = function (store) {
      return store.frozen || (store.frozen = new UncaughtFrozenStore());
    };

    var UncaughtFrozenStore = function () {
      this.entries = [];
    };

    var findUncaughtFrozen = function (store, key) {
      return find(store.entries, function (it) {
        return it[0] === key;
      });
    };

    UncaughtFrozenStore.prototype = {
      get: function (key) {
        var entry = findUncaughtFrozen(this, key);
        if (entry) return entry[1];
      },
      has: function (key) {
        return !!findUncaughtFrozen(this, key);
      },
      set: function (key, value) {
        var entry = findUncaughtFrozen(this, key);
        if (entry) entry[1] = value;
        else this.entries.push([key, value]);
      },
      'delete': function (key) {
        var index = findIndex(this.entries, function (it) {
          return it[0] === key;
        });
        if (~index) this.entries.splice(index, 1);
        return !!~index;
      }
    };

    var collectionWeak = {
      getConstructor: function (wrapper, CONSTRUCTOR_NAME, IS_MAP, ADDER) {
        var C = wrapper(function (that, iterable) {
          anInstance(that, C, CONSTRUCTOR_NAME);
          setInternalState$2(that, {
            type: CONSTRUCTOR_NAME,
            id: id$1++,
            frozen: undefined
          });
          if (iterable != undefined) iterate_1(iterable, that[ADDER], that, IS_MAP);
        });

        var getInternalState = internalStateGetterFor(CONSTRUCTOR_NAME);

        var define = function (that, key, value) {
          var state = getInternalState(that);
          var data = getWeakData(anObject(key), true);
          if (data === true) uncaughtFrozenStore(state).set(key, value);
          else data[state.id] = value;
          return that;
        };

        redefineAll(C.prototype, {
          // 23.3.3.2 WeakMap.prototype.delete(key)
          // 23.4.3.3 WeakSet.prototype.delete(value)
          'delete': function (key) {
            var state = getInternalState(this);
            if (!isObject(key)) return false;
            var data = getWeakData(key);
            if (data === true) return uncaughtFrozenStore(state)['delete'](key);
            return data && has(data, state.id) && delete data[state.id];
          },
          // 23.3.3.4 WeakMap.prototype.has(key)
          // 23.4.3.4 WeakSet.prototype.has(value)
          has: function has$1(key) {
            var state = getInternalState(this);
            if (!isObject(key)) return false;
            var data = getWeakData(key);
            if (data === true) return uncaughtFrozenStore(state).has(key);
            return data && has(data, state.id);
          }
        });

        redefineAll(C.prototype, IS_MAP ? {
          // 23.3.3.3 WeakMap.prototype.get(key)
          get: function get(key) {
            var state = getInternalState(this);
            if (isObject(key)) {
              var data = getWeakData(key);
              if (data === true) return uncaughtFrozenStore(state).get(key);
              return data ? data[state.id] : undefined;
            }
          },
          // 23.3.3.5 WeakMap.prototype.set(key, value)
          set: function set(key, value) {
            return define(this, key, value);
          }
        } : {
          // 23.4.3.1 WeakSet.prototype.add(value)
          add: function add(value) {
            return define(this, value, true);
          }
        });

        return C;
      }
    };

    var es_weakMap = createCommonjsModule(function (module) {






    var enforceIternalState = internalState.enforce;


    var IS_IE11 = !global_1.ActiveXObject && 'ActiveXObject' in global_1;
    var isExtensible = Object.isExtensible;
    var InternalWeakMap;

    var wrapper = function (init) {
      return function WeakMap() {
        return init(this, arguments.length ? arguments[0] : undefined);
      };
    };

    // `WeakMap` constructor
    // https://tc39.github.io/ecma262/#sec-weakmap-constructor
    var $WeakMap = module.exports = collection('WeakMap', wrapper, collectionWeak);

    // IE11 WeakMap frozen keys fix
    // We can't use feature detection because it crash some old IE builds
    // https://github.com/zloirock/core-js/issues/485
    if (nativeWeakMap && IS_IE11) {
      InternalWeakMap = collectionWeak.getConstructor(wrapper, 'WeakMap', true);
      internalMetadata.REQUIRED = true;
      var WeakMapPrototype = $WeakMap.prototype;
      var nativeDelete = WeakMapPrototype['delete'];
      var nativeHas = WeakMapPrototype.has;
      var nativeGet = WeakMapPrototype.get;
      var nativeSet = WeakMapPrototype.set;
      redefineAll(WeakMapPrototype, {
        'delete': function (key) {
          if (isObject(key) && !isExtensible(key)) {
            var state = enforceIternalState(this);
            if (!state.frozen) state.frozen = new InternalWeakMap();
            return nativeDelete.call(this, key) || state.frozen['delete'](key);
          } return nativeDelete.call(this, key);
        },
        has: function has(key) {
          if (isObject(key) && !isExtensible(key)) {
            var state = enforceIternalState(this);
            if (!state.frozen) state.frozen = new InternalWeakMap();
            return nativeHas.call(this, key) || state.frozen.has(key);
          } return nativeHas.call(this, key);
        },
        get: function get(key) {
          if (isObject(key) && !isExtensible(key)) {
            var state = enforceIternalState(this);
            if (!state.frozen) state.frozen = new InternalWeakMap();
            return nativeHas.call(this, key) ? nativeGet.call(this, key) : state.frozen.get(key);
          } return nativeGet.call(this, key);
        },
        set: function set(key, value) {
          if (isObject(key) && !isExtensible(key)) {
            var state = enforceIternalState(this);
            if (!state.frozen) state.frozen = new InternalWeakMap();
            nativeHas.call(this, key) ? nativeSet.call(this, key, value) : state.frozen.set(key, value);
          } else nativeSet.call(this, key, value);
          return this;
        }
      });
    }
    });

    var ITERATOR$5 = wellKnownSymbol('iterator');
    var TO_STRING_TAG$3 = wellKnownSymbol('toStringTag');
    var ArrayValues = es_array_iterator.values;

    for (var COLLECTION_NAME$1 in domIterables) {
      var Collection$1 = global_1[COLLECTION_NAME$1];
      var CollectionPrototype$1 = Collection$1 && Collection$1.prototype;
      if (CollectionPrototype$1) {
        // some Chrome versions have non-configurable methods on DOMTokenList
        if (CollectionPrototype$1[ITERATOR$5] !== ArrayValues) try {
          createNonEnumerableProperty(CollectionPrototype$1, ITERATOR$5, ArrayValues);
        } catch (error) {
          CollectionPrototype$1[ITERATOR$5] = ArrayValues;
        }
        if (!CollectionPrototype$1[TO_STRING_TAG$3]) {
          createNonEnumerableProperty(CollectionPrototype$1, TO_STRING_TAG$3, COLLECTION_NAME$1);
        }
        if (domIterables[COLLECTION_NAME$1]) for (var METHOD_NAME in es_array_iterator) {
          // some Chrome versions have non-configurable methods on DOMTokenList
          if (CollectionPrototype$1[METHOD_NAME] !== es_array_iterator[METHOD_NAME]) try {
            createNonEnumerableProperty(CollectionPrototype$1, METHOD_NAME, es_array_iterator[METHOD_NAME]);
          } catch (error) {
            CollectionPrototype$1[METHOD_NAME] = es_array_iterator[METHOD_NAME];
          }
        }
      }
    }

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root = freeGlobal || freeSelf || Function('return this')();

    /** Built-in value references. */
    var Symbol$2 = root.Symbol;

    /** Used for built-in method references. */
    var objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$1 = objectProto.hasOwnProperty;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString = objectProto.toString;

    /** Built-in value references. */
    var symToStringTag = Symbol$2 ? Symbol$2.toStringTag : undefined;

    /**
     * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the raw `toStringTag`.
     */
    function getRawTag(value) {
      var isOwn = hasOwnProperty$1.call(value, symToStringTag),
          tag = value[symToStringTag];

      try {
        value[symToStringTag] = undefined;
        var unmasked = true;
      } catch (e) {}

      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }

    /** Used for built-in method references. */
    var objectProto$1 = Object.prototype;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString$1 = objectProto$1.toString;

    /**
     * Converts `value` to a string using `Object.prototype.toString`.
     *
     * @private
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     */
    function objectToString$1(value) {
      return nativeObjectToString$1.call(value);
    }

    /** `Object#toString` result references. */
    var nullTag = '[object Null]',
        undefinedTag = '[object Undefined]';

    /** Built-in value references. */
    var symToStringTag$1 = Symbol$2 ? Symbol$2.toStringTag : undefined;

    /**
     * The base implementation of `getTag` without fallbacks for buggy environments.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function baseGetTag(value) {
      if (value == null) {
        return value === undefined ? undefinedTag : nullTag;
      }
      return (symToStringTag$1 && symToStringTag$1 in Object(value))
        ? getRawTag(value)
        : objectToString$1(value);
    }

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return value != null && typeof value == 'object';
    }

    /** `Object#toString` result references. */
    var symbolTag = '[object Symbol]';

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike(value) && baseGetTag(value) == symbolTag);
    }

    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject$1(value) {
      var type = typeof value;
      return value != null && (type == 'object' || type == 'function');
    }

    /** Used as references for various `Number` constants. */
    var NAN = 0 / 0;

    /** Used to match leading and trailing whitespace. */
    var reTrim = /^\s+|\s+$/g;

    /** Used to detect bad signed hexadecimal string values. */
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

    /** Used to detect binary string values. */
    var reIsBinary = /^0b[01]+$/i;

    /** Used to detect octal string values. */
    var reIsOctal = /^0o[0-7]+$/i;

    /** Built-in method references without a dependency on `root`. */
    var freeParseInt = parseInt;

    /**
     * Converts `value` to a number.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to process.
     * @returns {number} Returns the number.
     * @example
     *
     * _.toNumber(3.2);
     * // => 3.2
     *
     * _.toNumber(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toNumber(Infinity);
     * // => Infinity
     *
     * _.toNumber('3.2');
     * // => 3.2
     */
    function toNumber(value) {
      if (typeof value == 'number') {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject$1(value)) {
        var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
        value = isObject$1(other) ? (other + '') : other;
      }
      if (typeof value != 'string') {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, '');
      var isBinary = reIsBinary.test(value);
      return (isBinary || reIsOctal.test(value))
        ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
        : (reIsBadHex.test(value) ? NAN : +value);
    }

    /** `Object#toString` result references. */
    var asyncTag = '[object AsyncFunction]',
        funcTag = '[object Function]',
        genTag = '[object GeneratorFunction]',
        proxyTag = '[object Proxy]';

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      if (!isObject$1(value)) {
        return false;
      }
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 9 which returns 'object' for typed arrays and other constructors.
      var tag = baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }

    /** Used to detect overreaching core-js shims. */
    var coreJsData = root['__core-js_shared__'];

    /** Used to detect methods masquerading as native. */
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
      return uid ? ('Symbol(src)_1.' + uid) : '';
    }());

    /**
     * Checks if `func` has its source masked.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` is masked, else `false`.
     */
    function isMasked(func) {
      return !!maskSrcKey && (maskSrcKey in func);
    }

    /** Used for built-in method references. */
    var funcProto = Function.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString = funcProto.toString;

    /**
     * Converts `func` to its source code.
     *
     * @private
     * @param {Function} func The function to convert.
     * @returns {string} Returns the source code.
     */
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {}
        try {
          return (func + '');
        } catch (e) {}
      }
      return '';
    }

    /**
     * Used to match `RegExp`
     * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
     */
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

    /** Used to detect host constructors (Safari). */
    var reIsHostCtor = /^\[object .+?Constructor\]$/;

    /** Used for built-in method references. */
    var funcProto$1 = Function.prototype,
        objectProto$2 = Object.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString$1 = funcProto$1.toString;

    /** Used to check objects for own properties. */
    var hasOwnProperty$2 = objectProto$2.hasOwnProperty;

    /** Used to detect if a method is native. */
    var reIsNative = RegExp('^' +
      funcToString$1.call(hasOwnProperty$2).replace(reRegExpChar, '\\$&')
      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
    );

    /**
     * The base implementation of `_.isNative` without bad shim checks.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     */
    function baseIsNative(value) {
      if (!isObject$1(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }

    /**
     * Gets the value at `key` of `object`.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {string} key The key of the property to get.
     * @returns {*} Returns the property value.
     */
    function getValue(object, key) {
      return object == null ? undefined : object[key];
    }

    /**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : undefined;
    }

    /**
     * Performs a
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */
    function eq(value, other) {
      return value === other || (value !== value && other !== other);
    }

    /* Built-in method references that are verified to be native. */
    var nativeCreate = getNative(Object, 'create');

    /**
     * Removes all key-value entries from the hash.
     *
     * @private
     * @name clear
     * @memberOf Hash
     */
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
      this.size = 0;
    }

    /**
     * Removes `key` and its value from the hash.
     *
     * @private
     * @name delete
     * @memberOf Hash
     * @param {Object} hash The hash to modify.
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED = '__lodash_hash_undefined__';

    /** Used for built-in method references. */
    var objectProto$3 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$3 = objectProto$3.hasOwnProperty;

    /**
     * Gets the hash value for `key`.
     *
     * @private
     * @name get
     * @memberOf Hash
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? undefined : result;
      }
      return hasOwnProperty$3.call(data, key) ? data[key] : undefined;
    }

    /** Used for built-in method references. */
    var objectProto$4 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$4 = objectProto$4.hasOwnProperty;

    /**
     * Checks if a hash value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Hash
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? (data[key] !== undefined) : hasOwnProperty$4.call(data, key);
    }

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

    /**
     * Sets the hash `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Hash
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the hash instance.
     */
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED$1 : value;
      return this;
    }

    /**
     * Creates a hash object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function Hash(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `Hash`.
    Hash.prototype.clear = hashClear;
    Hash.prototype['delete'] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;

    /**
     * Removes all key-value entries from the list cache.
     *
     * @private
     * @name clear
     * @memberOf ListCache
     */
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }

    /**
     * Gets the index at which the `key` is found in `array` of key-value pairs.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} key The key to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }

    /** Used for built-in method references. */
    var arrayProto = Array.prototype;

    /** Built-in value references. */
    var splice = arrayProto.splice;

    /**
     * Removes `key` and its value from the list cache.
     *
     * @private
     * @name delete
     * @memberOf ListCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function listCacheDelete(key) {
      var data = this.__data__,
          index = assocIndexOf(data, key);

      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }

    /**
     * Gets the list cache value for `key`.
     *
     * @private
     * @name get
     * @memberOf ListCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function listCacheGet(key) {
      var data = this.__data__,
          index = assocIndexOf(data, key);

      return index < 0 ? undefined : data[index][1];
    }

    /**
     * Checks if a list cache value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf ListCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }

    /**
     * Sets the list cache `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf ListCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the list cache instance.
     */
    function listCacheSet(key, value) {
      var data = this.__data__,
          index = assocIndexOf(data, key);

      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }

    /**
     * Creates an list cache object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function ListCache(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `ListCache`.
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype['delete'] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;

    /* Built-in method references that are verified to be native. */
    var Map$1 = getNative(root, 'Map');

    /**
     * Removes all key-value entries from the map.
     *
     * @private
     * @name clear
     * @memberOf MapCache
     */
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        'hash': new Hash,
        'map': new (Map$1 || ListCache),
        'string': new Hash
      };
    }

    /**
     * Checks if `value` is suitable for use as unique object key.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
     */
    function isKeyable(value) {
      var type = typeof value;
      return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
        ? (value !== '__proto__')
        : (value === null);
    }

    /**
     * Gets the data for `map`.
     *
     * @private
     * @param {Object} map The map to query.
     * @param {string} key The reference key.
     * @returns {*} Returns the map data.
     */
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key)
        ? data[typeof key == 'string' ? 'string' : 'hash']
        : data.map;
    }

    /**
     * Removes `key` and its value from the map.
     *
     * @private
     * @name delete
     * @memberOf MapCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function mapCacheDelete(key) {
      var result = getMapData(this, key)['delete'](key);
      this.size -= result ? 1 : 0;
      return result;
    }

    /**
     * Gets the map value for `key`.
     *
     * @private
     * @name get
     * @memberOf MapCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }

    /**
     * Checks if a map value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf MapCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }

    /**
     * Sets the map `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf MapCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the map cache instance.
     */
    function mapCacheSet(key, value) {
      var data = getMapData(this, key),
          size = data.size;

      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }

    /**
     * Creates a map cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function MapCache(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `MapCache`.
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype['delete'] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;

    /** Error message constants. */
    var FUNC_ERROR_TEXT = 'Expected a function';

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided, it determines the cache key for storing the result based on the
     * arguments provided to the memoized function. By default, the first argument
     * provided to the memoized function is used as the map cache key. The `func`
     * is invoked with the `this` binding of the memoized function.
     *
     * **Note:** The cache is exposed as the `cache` property on the memoized
     * function. Its creation may be customized by replacing the `_.memoize.Cache`
     * constructor with one whose instances implement the
     * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
     * method interface of `clear`, `delete`, `get`, `has`, and `set`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] The function to resolve the cache key.
     * @returns {Function} Returns the new memoized function.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     * var other = { 'c': 3, 'd': 4 };
     *
     * var values = _.memoize(_.values);
     * values(object);
     * // => [1, 2]
     *
     * values(other);
     * // => [3, 4]
     *
     * object.a = 2;
     * values(object);
     * // => [1, 2]
     *
     * // Modify the result cache.
     * values.cache.set(object, ['a', 'b']);
     * values(object);
     * // => ['a', 'b']
     *
     * // Replace `_.memoize.Cache`.
     * _.memoize.Cache = WeakMap;
     */
    function memoize(func, resolver) {
      if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments,
            key = resolver ? resolver.apply(this, args) : args[0],
            cache = memoized.cache;

        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result) || cache;
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache);
      return memoized;
    }

    // Expose `MapCache`.
    memoize.Cache = MapCache;

    /**
     * Gets the timestamp of the number of milliseconds that have elapsed since
     * the Unix epoch (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Date
     * @returns {number} Returns the timestamp.
     * @example
     *
     * _.defer(function(stamp) {
     *   console.log(_.now() - stamp);
     * }, _.now());
     * // => Logs the number of milliseconds it took for the deferred invocation.
     */
    var now = function() {
      return root.Date.now();
    };

    /** Error message constants. */
    var FUNC_ERROR_TEXT$1 = 'Expected a function';

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeMax = Math.max,
        nativeMin = Math.min;

    /**
     * Creates a debounced function that delays invoking `func` until after `wait`
     * milliseconds have elapsed since the last time the debounced function was
     * invoked. The debounced function comes with a `cancel` method to cancel
     * delayed `func` invocations and a `flush` method to immediately invoke them.
     * Provide `options` to indicate whether `func` should be invoked on the
     * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
     * with the last arguments provided to the debounced function. Subsequent
     * calls to the debounced function return the result of the last `func`
     * invocation.
     *
     * **Note:** If `leading` and `trailing` options are `true`, `func` is
     * invoked on the trailing edge of the timeout only if the debounced function
     * is invoked more than once during the `wait` timeout.
     *
     * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
     * until to the next tick, similar to `setTimeout` with a timeout of `0`.
     *
     * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
     * for details over the differences between `_.debounce` and `_.throttle`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to debounce.
     * @param {number} [wait=0] The number of milliseconds to delay.
     * @param {Object} [options={}] The options object.
     * @param {boolean} [options.leading=false]
     *  Specify invoking on the leading edge of the timeout.
     * @param {number} [options.maxWait]
     *  The maximum time `func` is allowed to be delayed before it's invoked.
     * @param {boolean} [options.trailing=true]
     *  Specify invoking on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // Avoid costly calculations while the window size is in flux.
     * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
     *
     * // Invoke `sendMail` when clicked, debouncing subsequent calls.
     * jQuery(element).on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * }));
     *
     * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
     * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
     * var source = new EventSource('/stream');
     * jQuery(source).on('message', debounced);
     *
     * // Cancel the trailing debounced invocation.
     * jQuery(window).on('popstate', debounced.cancel);
     */
    function debounce(func, wait, options) {
      var lastArgs,
          lastThis,
          maxWait,
          result,
          timerId,
          lastCallTime,
          lastInvokeTime = 0,
          leading = false,
          maxing = false,
          trailing = true;

      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT$1);
      }
      wait = toNumber(wait) || 0;
      if (isObject$1(options)) {
        leading = !!options.leading;
        maxing = 'maxWait' in options;
        maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
        trailing = 'trailing' in options ? !!options.trailing : trailing;
      }

      function invokeFunc(time) {
        var args = lastArgs,
            thisArg = lastThis;

        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result;
      }

      function leadingEdge(time) {
        // Reset any `maxWait` timer.
        lastInvokeTime = time;
        // Start the timer for the trailing edge.
        timerId = setTimeout(timerExpired, wait);
        // Invoke the leading edge.
        return leading ? invokeFunc(time) : result;
      }

      function remainingWait(time) {
        var timeSinceLastCall = time - lastCallTime,
            timeSinceLastInvoke = time - lastInvokeTime,
            timeWaiting = wait - timeSinceLastCall;

        return maxing
          ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
          : timeWaiting;
      }

      function shouldInvoke(time) {
        var timeSinceLastCall = time - lastCallTime,
            timeSinceLastInvoke = time - lastInvokeTime;

        // Either this is the first call, activity has stopped and we're at the
        // trailing edge, the system time has gone backwards and we're treating
        // it as the trailing edge, or we've hit the `maxWait` limit.
        return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
          (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
      }

      function timerExpired() {
        var time = now();
        if (shouldInvoke(time)) {
          return trailingEdge(time);
        }
        // Restart the timer.
        timerId = setTimeout(timerExpired, remainingWait(time));
      }

      function trailingEdge(time) {
        timerId = undefined;

        // Only invoke if we have `lastArgs` which means `func` has been
        // debounced at least once.
        if (trailing && lastArgs) {
          return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return result;
      }

      function cancel() {
        if (timerId !== undefined) {
          clearTimeout(timerId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timerId = undefined;
      }

      function flush() {
        return timerId === undefined ? result : trailingEdge(now());
      }

      function debounced() {
        var time = now(),
            isInvoking = shouldInvoke(time);

        lastArgs = arguments;
        lastThis = this;
        lastCallTime = time;

        if (isInvoking) {
          if (timerId === undefined) {
            return leadingEdge(lastCallTime);
          }
          if (maxing) {
            // Handle invocations in a tight loop.
            clearTimeout(timerId);
            timerId = setTimeout(timerExpired, wait);
            return invokeFunc(lastCallTime);
          }
        }
        if (timerId === undefined) {
          timerId = setTimeout(timerExpired, wait);
        }
        return result;
      }
      debounced.cancel = cancel;
      debounced.flush = flush;
      return debounced;
    }

    /** Error message constants. */
    var FUNC_ERROR_TEXT$2 = 'Expected a function';

    /**
     * Creates a throttled function that only invokes `func` at most once per
     * every `wait` milliseconds. The throttled function comes with a `cancel`
     * method to cancel delayed `func` invocations and a `flush` method to
     * immediately invoke them. Provide `options` to indicate whether `func`
     * should be invoked on the leading and/or trailing edge of the `wait`
     * timeout. The `func` is invoked with the last arguments provided to the
     * throttled function. Subsequent calls to the throttled function return the
     * result of the last `func` invocation.
     *
     * **Note:** If `leading` and `trailing` options are `true`, `func` is
     * invoked on the trailing edge of the timeout only if the throttled function
     * is invoked more than once during the `wait` timeout.
     *
     * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
     * until to the next tick, similar to `setTimeout` with a timeout of `0`.
     *
     * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
     * for details over the differences between `_.throttle` and `_.debounce`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to throttle.
     * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
     * @param {Object} [options={}] The options object.
     * @param {boolean} [options.leading=true]
     *  Specify invoking on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true]
     *  Specify invoking on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * // Avoid excessively updating the position while scrolling.
     * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
     *
     * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
     * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
     * jQuery(element).on('click', throttled);
     *
     * // Cancel the trailing throttled invocation.
     * jQuery(window).on('popstate', throttled.cancel);
     */
    function throttle(func, wait, options) {
      var leading = true,
          trailing = true;

      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT$2);
      }
      if (isObject$1(options)) {
        leading = 'leading' in options ? !!options.leading : leading;
        trailing = 'trailing' in options ? !!options.trailing : trailing;
      }
      return debounce(func, wait, {
        'leading': leading,
        'maxWait': wait,
        'trailing': trailing
      });
    }

    /**
     * SimpleBar.js - v1.0.0
     * Scrollbars, simpler.
     * https://grsmto.github.io/simplebar/
     *
     * Made by Adrien Denat from a fork by Jonathan Nicol
     * Under MIT License
     */

    var cachedScrollbarWidth = null;
    var cachedDevicePixelRatio = null;

    if (canUseDom) {
      window.addEventListener('resize', function () {
        if (cachedDevicePixelRatio !== window.devicePixelRatio) {
          cachedDevicePixelRatio = window.devicePixelRatio;
          cachedScrollbarWidth = null;
        }
      });
    }

    function scrollbarWidth() {
      if (cachedScrollbarWidth === null) {
        if (typeof document === 'undefined') {
          cachedScrollbarWidth = 0;
          return cachedScrollbarWidth;
        }

        var body = document.body;
        var box = document.createElement('div');
        box.classList.add('simplebar-hide-scrollbar');
        body.appendChild(box);
        var width = box.getBoundingClientRect().right;
        body.removeChild(box);
        cachedScrollbarWidth = width;
      }

      return cachedScrollbarWidth;
    }

    function getElementWindow(element) {
      if (!element || !element.ownerDocument || !element.ownerDocument.defaultView) {
        return window;
      }

      return element.ownerDocument.defaultView;
    }
    function getElementDocument(element) {
      if (!element || !element.ownerDocument) {
        return document;
      }

      return element.ownerDocument;
    }

    var SimpleBar = /*#__PURE__*/function () {
      function SimpleBar(element, options) {
        var _this = this;

        if (options === void 0) {
          options = {};
        }

        this.onScroll = function () {
          var elWindow = getElementWindow(_this.el);

          if (!_this.scrollXTicking) {
            elWindow.requestAnimationFrame(_this.scrollX);
            _this.scrollXTicking = true;
          }

          if (!_this.scrollYTicking) {
            elWindow.requestAnimationFrame(_this.scrollY);
            _this.scrollYTicking = true;
          }

          if (!_this.isScrolling) {
            _this.isScrolling = true;

            _this.el.classList.add(_this.classNames.scrolling);
          }

          _this.onStopScrolling();
        };

        this.scrollX = function () {
          if (_this.axis.x.isOverflowing) {
            _this.positionScrollbar('x');
          }

          _this.scrollXTicking = false;
        };

        this.scrollY = function () {
          if (_this.axis.y.isOverflowing) {
            _this.positionScrollbar('y');
          }

          _this.scrollYTicking = false;
        };

        this.onStopScrolling = function () {
          _this.el.classList.remove(_this.classNames.scrolling);

          _this.isScrolling = false;
        };

        this.onMouseEnter = function () {
          if (!_this.isMouseEntering) {
            _this.el.classList.add(_this.classNames.mouseEntered);

            _this.isMouseEntering = true;
          }

          _this.onMouseEntered();
        };

        this.onMouseEntered = function () {
          _this.el.classList.remove(_this.classNames.mouseEntered);

          _this.isMouseEntering = false;
        };

        this.onMouseMove = function (e) {
          _this.mouseX = e.clientX;
          _this.mouseY = e.clientY;

          if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
            _this.onMouseMoveForAxis('x');
          }

          if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
            _this.onMouseMoveForAxis('y');
          }
        };

        this.onMouseLeave = function () {
          _this.onMouseMove.cancel();

          if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
            _this.onMouseLeaveForAxis('x');
          }

          if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
            _this.onMouseLeaveForAxis('y');
          }

          _this.mouseX = -1;
          _this.mouseY = -1;
        };

        this.onWindowResize = function () {
          // Recalculate scrollbarWidth in case it's a zoom
          _this.scrollbarWidth = _this.getScrollbarWidth();

          _this.hideNativeScrollbar();
        };

        this.onPointerEvent = function (e) {
          var isWithinTrackXBounds, isWithinTrackYBounds;
          _this.axis.x.track.rect = _this.axis.x.track.el.getBoundingClientRect();
          _this.axis.y.track.rect = _this.axis.y.track.el.getBoundingClientRect();

          if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
            isWithinTrackXBounds = _this.isWithinBounds(_this.axis.x.track.rect);
          }

          if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
            isWithinTrackYBounds = _this.isWithinBounds(_this.axis.y.track.rect);
          } // If any pointer event is called on the scrollbar


          if (isWithinTrackXBounds || isWithinTrackYBounds) {
            // Preventing the event's default action stops text being
            // selectable during the drag.
            e.preventDefault(); // Prevent event leaking

            e.stopPropagation();

            if (e.type === 'mousedown') {
              if (isWithinTrackXBounds) {
                _this.axis.x.scrollbar.rect = _this.axis.x.scrollbar.el.getBoundingClientRect();

                if (_this.isWithinBounds(_this.axis.x.scrollbar.rect)) {
                  _this.onDragStart(e, 'x');
                } else {
                  _this.onTrackClick(e, 'x');
                }
              }

              if (isWithinTrackYBounds) {
                _this.axis.y.scrollbar.rect = _this.axis.y.scrollbar.el.getBoundingClientRect();

                if (_this.isWithinBounds(_this.axis.y.scrollbar.rect)) {
                  _this.onDragStart(e, 'y');
                } else {
                  _this.onTrackClick(e, 'y');
                }
              }
            }
          }
        };

        this.drag = function (e) {
          var eventOffset;
          var track = _this.axis[_this.draggedAxis].track;
          var trackSize = track.rect[_this.axis[_this.draggedAxis].sizeAttr];
          var scrollbar = _this.axis[_this.draggedAxis].scrollbar;
          var contentSize = _this.contentWrapperEl[_this.axis[_this.draggedAxis].scrollSizeAttr];
          var hostSize = parseInt(_this.elStyles[_this.axis[_this.draggedAxis].sizeAttr], 10);
          e.preventDefault();
          e.stopPropagation();

          if (_this.draggedAxis === 'y') {
            eventOffset = e.pageY;
          } else {
            eventOffset = e.pageX;
          } // Calculate how far the user's mouse is from the top/left of the scrollbar (minus the dragOffset).


          var dragPos = eventOffset - track.rect[_this.axis[_this.draggedAxis].offsetAttr] - _this.axis[_this.draggedAxis].dragOffset; // Convert the mouse position into a percentage of the scrollbar height/width.

          var dragPerc = dragPos / (trackSize - scrollbar.size); // Scroll the content by the same percentage.

          var scrollPos = dragPerc * (contentSize - hostSize); // Fix browsers inconsistency on RTL

          if (_this.draggedAxis === 'x') {
            scrollPos = _this.isRtl && SimpleBar.getRtlHelpers().isScrollOriginAtZero ? scrollPos - (trackSize + scrollbar.size) : scrollPos;
          }

          _this.contentWrapperEl[_this.axis[_this.draggedAxis].scrollOffsetAttr] = scrollPos;
        };

        this.onEndDrag = function (e) {
          var elDocument = getElementDocument(_this.el);
          var elWindow = getElementWindow(_this.el);
          e.preventDefault();
          e.stopPropagation();

          _this.el.classList.remove(_this.classNames.dragging);

          elDocument.removeEventListener('mousemove', _this.drag, true);
          elDocument.removeEventListener('mouseup', _this.onEndDrag, true);
          _this.removePreventClickId = elWindow.setTimeout(function () {
            // Remove these asynchronously so we still suppress click events
            // generated simultaneously with mouseup.
            elDocument.removeEventListener('click', _this.preventClick, true);
            elDocument.removeEventListener('dblclick', _this.preventClick, true);
            _this.removePreventClickId = null;
          });
        };

        this.preventClick = function (e) {
          e.preventDefault();
          e.stopPropagation();
        };

        this.el = element;
        this.minScrollbarWidth = 20;
        this.stopScrollDelay = 175;
        this.options = Object.assign({}, SimpleBar.defaultOptions, options);
        this.classNames = Object.assign({}, SimpleBar.defaultOptions.classNames, this.options.classNames);
        this.axis = {
          x: {
            scrollOffsetAttr: 'scrollLeft',
            sizeAttr: 'width',
            scrollSizeAttr: 'scrollWidth',
            offsetSizeAttr: 'offsetWidth',
            offsetAttr: 'left',
            overflowAttr: 'overflowX',
            dragOffset: 0,
            isOverflowing: true,
            isVisible: false,
            forceVisible: false,
            track: {},
            scrollbar: {}
          },
          y: {
            scrollOffsetAttr: 'scrollTop',
            sizeAttr: 'height',
            scrollSizeAttr: 'scrollHeight',
            offsetSizeAttr: 'offsetHeight',
            offsetAttr: 'top',
            overflowAttr: 'overflowY',
            dragOffset: 0,
            isOverflowing: true,
            isVisible: false,
            forceVisible: false,
            track: {},
            scrollbar: {}
          }
        };
        this.removePreventClickId = null;
        this.isScrolling = false;
        this.isMouseEntering = false; // Don't re-instantiate over an existing one

        if (SimpleBar.instances.has(this.el)) {
          return;
        }

        if (options.classNames) {
          console.warn('simplebar: classNames option is deprecated. Please override the styles with CSS instead.');
        }

        if (options.autoHide) {
          console.warn("simplebar: autoHide option is deprecated. Please use CSS instead: '.simplebar-scrollbar::before { opacity: 0.5 };' for autoHide: false");
        }

        this.recalculate = throttle(this.recalculate, 64);
        this.onMouseMove = throttle(this.onMouseMove, 64);
        this.onWindowResize = debounce(this.onWindowResize, 64, {
          leading: true
        });
        this.onStopScrolling = debounce(this.onStopScrolling, this.stopScrollDelay);
        this.onMouseEntered = debounce(this.onMouseEntered, this.stopScrollDelay);
        SimpleBar.getRtlHelpers = memoize(SimpleBar.getRtlHelpers);
        this.init();
      }
      /**
       * Static properties
       */

      /**
       * Helper to fix browsers inconsistency on RTL:
       *  - Firefox inverts the scrollbar initial position
       *  - IE11 inverts both scrollbar position and scrolling offset
       * Directly inspired by @KingSora's OverlayScrollbars https://github.com/KingSora/OverlayScrollbars/blob/master/js/OverlayScrollbars.js#L1634
       */


      SimpleBar.getRtlHelpers = function getRtlHelpers() {
        var dummyDiv = document.createElement('div');
        dummyDiv.innerHTML = '<div class="simplebar-dummy-scrollbar-size"><div></div></div>';
        var scrollbarDummyEl = dummyDiv.firstElementChild;
        var dummyChild = scrollbarDummyEl.firstElementChild;
        document.body.appendChild(scrollbarDummyEl);
        scrollbarDummyEl.scrollLeft = 0;
        var dummyContainerOffset = SimpleBar.getOffset(scrollbarDummyEl);
        var dummyChildOffset = SimpleBar.getOffset(dummyChild);
        scrollbarDummyEl.scrollLeft = -999;
        var dummyChildOffsetAfterScroll = SimpleBar.getOffset(dummyChild);
        return {
          // determines if the scrolling is responding with negative values
          isScrollOriginAtZero: dummyContainerOffset.left !== dummyChildOffset.left,
          // determines if the origin scrollbar position is inverted or not (positioned on left or right)
          isScrollingToNegative: dummyChildOffset.left !== dummyChildOffsetAfterScroll.left
        };
      };

      SimpleBar.getOffset = function getOffset(el) {
        var rect = el.getBoundingClientRect();
        var elDocument = getElementDocument(el);
        var elWindow = getElementWindow(el);
        return {
          top: rect.top + (elWindow.pageYOffset || elDocument.documentElement.scrollTop),
          left: rect.left + (elWindow.pageXOffset || elDocument.documentElement.scrollLeft)
        };
      };

      var _proto = SimpleBar.prototype;

      _proto.init = function init() {
        // Save a reference to the instance, so we know this DOM node has already been instancied
        SimpleBar.instances.set(this.el, this); // We stop here on server-side

        if (canUseDom) {
          this.initDOM();
          this.scrollbarWidth = this.getScrollbarWidth();
          this.recalculate();
          this.initListeners();
        }
      };

      _proto.initDOM = function initDOM() {
        var _this2 = this;

        // make sure this element doesn't have the elements yet
        if (Array.prototype.filter.call(this.el.children, function (child) {
          return child.classList.contains(_this2.classNames.wrapper);
        }).length) {
          // assume that element has his DOM already initiated
          this.wrapperEl = this.el.querySelector("." + this.classNames.wrapper);
          this.contentWrapperEl = this.options.scrollableNode || this.el.querySelector("." + this.classNames.contentWrapper);
          this.contentEl = this.options.contentNode || this.el.querySelector("." + this.classNames.contentEl);
          this.offsetEl = this.el.querySelector("." + this.classNames.offset);
          this.maskEl = this.el.querySelector("." + this.classNames.mask);
          this.placeholderEl = this.findChild(this.wrapperEl, "." + this.classNames.placeholder);
          this.heightAutoObserverWrapperEl = this.el.querySelector("." + this.classNames.heightAutoObserverWrapperEl);
          this.heightAutoObserverEl = this.el.querySelector("." + this.classNames.heightAutoObserverEl);
          this.axis.x.track.el = this.findChild(this.el, "." + this.classNames.track + "." + this.classNames.horizontal);
          this.axis.y.track.el = this.findChild(this.el, "." + this.classNames.track + "." + this.classNames.vertical);
        } else {
          // Prepare DOM
          this.wrapperEl = document.createElement('div');
          this.contentWrapperEl = document.createElement('div');
          this.offsetEl = document.createElement('div');
          this.maskEl = document.createElement('div');
          this.contentEl = document.createElement('div');
          this.placeholderEl = document.createElement('div');
          this.heightAutoObserverWrapperEl = document.createElement('div');
          this.heightAutoObserverEl = document.createElement('div');
          this.wrapperEl.classList.add(this.classNames.wrapper);
          this.contentWrapperEl.classList.add(this.classNames.contentWrapper);
          this.offsetEl.classList.add(this.classNames.offset);
          this.maskEl.classList.add(this.classNames.mask);
          this.contentEl.classList.add(this.classNames.contentEl);
          this.placeholderEl.classList.add(this.classNames.placeholder);
          this.heightAutoObserverWrapperEl.classList.add(this.classNames.heightAutoObserverWrapperEl);
          this.heightAutoObserverEl.classList.add(this.classNames.heightAutoObserverEl);

          while (this.el.firstChild) {
            this.contentEl.appendChild(this.el.firstChild);
          }

          this.contentWrapperEl.appendChild(this.contentEl);
          this.offsetEl.appendChild(this.contentWrapperEl);
          this.maskEl.appendChild(this.offsetEl);
          this.heightAutoObserverWrapperEl.appendChild(this.heightAutoObserverEl);
          this.wrapperEl.appendChild(this.heightAutoObserverWrapperEl);
          this.wrapperEl.appendChild(this.maskEl);
          this.wrapperEl.appendChild(this.placeholderEl);
          this.el.appendChild(this.wrapperEl);
        }

        if (!this.axis.x.track.el || !this.axis.y.track.el) {
          var track = document.createElement('div');
          var scrollbar = document.createElement('div');
          track.classList.add(this.classNames.track);
          scrollbar.classList.add(this.classNames.scrollbar);
          track.appendChild(scrollbar);
          this.axis.x.track.el = track.cloneNode(true);
          this.axis.x.track.el.classList.add(this.classNames.horizontal);
          this.axis.y.track.el = track.cloneNode(true);
          this.axis.y.track.el.classList.add(this.classNames.vertical);
          this.el.appendChild(this.axis.x.track.el);
          this.el.appendChild(this.axis.y.track.el);
        }

        this.axis.x.scrollbar.el = this.axis.x.track.el.querySelector("." + this.classNames.scrollbar);
        this.axis.y.scrollbar.el = this.axis.y.track.el.querySelector("." + this.classNames.scrollbar);

        if (!this.options.autoHide) {
          this.axis.x.scrollbar.el.classList.add(this.classNames.visible);
          this.axis.y.scrollbar.el.classList.add(this.classNames.visible);
        }

        this.el.setAttribute('data-simplebar', 'init');
      };

      _proto.initListeners = function initListeners() {
        var _this3 = this;

        var elWindow = getElementWindow(this.el); // Event listeners

        this.el.addEventListener('mouseenter', this.onMouseEnter);
        ['mousedown', 'click', 'dblclick'].forEach(function (e) {
          _this3.el.addEventListener(e, _this3.onPointerEvent, true);
        });
        ['touchstart', 'touchend', 'touchmove'].forEach(function (e) {
          _this3.el.addEventListener(e, _this3.onPointerEvent, {
            capture: true,
            passive: true
          });
        });
        this.el.addEventListener('mousemove', this.onMouseMove);
        this.el.addEventListener('mouseleave', this.onMouseLeave);
        this.contentWrapperEl.addEventListener('scroll', this.onScroll); // Browser zoom triggers a window resize

        elWindow.addEventListener('resize', this.onWindowResize);

        if (window.ResizeObserver) {
          // Hack for https://github.com/WICG/ResizeObserver/issues/38
          var resizeObserverStarted = false;
          var resizeObserver = elWindow.ResizeObserver || ResizeObserver;
          this.resizeObserver = new resizeObserver(function () {
            if (!resizeObserverStarted) return;

            _this3.recalculate();
          });
          this.resizeObserver.observe(this.el);
          this.resizeObserver.observe(this.contentEl);
          elWindow.requestAnimationFrame(function () {
            resizeObserverStarted = true;
          });
        } // This is required to detect horizontal scroll. Vertical scroll only needs the resizeObserver.


        this.mutationObserver = new elWindow.MutationObserver(this.recalculate);
        this.mutationObserver.observe(this.contentEl, {
          childList: true,
          subtree: true,
          characterData: true
        });
      };

      _proto.recalculate = function recalculate() {
        var elWindow = getElementWindow(this.el);
        this.elStyles = elWindow.getComputedStyle(this.el);
        this.isRtl = this.elStyles.direction === 'rtl';
        var contentElOffsetWidth = this.contentEl.offsetWidth;
        var isHeightAuto = this.heightAutoObserverEl.offsetHeight <= 1;
        var isWidthAuto = this.heightAutoObserverEl.offsetWidth <= 1 || contentElOffsetWidth > 0;
        var contentWrapperElOffsetWidth = this.contentWrapperEl.offsetWidth;
        var elOverflowX = this.elStyles.overflowX;
        var elOverflowY = this.elStyles.overflowY;
        this.contentEl.style.padding = this.elStyles.paddingTop + " " + this.elStyles.paddingRight + " " + this.elStyles.paddingBottom + " " + this.elStyles.paddingLeft;
        this.wrapperEl.style.margin = "-" + this.elStyles.paddingTop + " -" + this.elStyles.paddingRight + " -" + this.elStyles.paddingBottom + " -" + this.elStyles.paddingLeft;
        var contentElScrollHeight = this.contentEl.scrollHeight;
        var contentElScrollWidth = this.contentEl.scrollWidth;
        this.contentWrapperEl.style.height = isHeightAuto ? 'auto' : '100%'; // Determine placeholder size

        this.placeholderEl.style.width = isWidthAuto ? (contentElOffsetWidth || contentElScrollWidth) + "px" : 'auto';
        this.placeholderEl.style.height = contentElScrollHeight + "px";
        var contentWrapperElOffsetHeight = this.contentWrapperEl.offsetHeight;
        this.axis.x.isOverflowing = contentElOffsetWidth !== 0 && contentElScrollWidth > contentElOffsetWidth;
        this.axis.y.isOverflowing = contentElScrollHeight > contentWrapperElOffsetHeight; // Set isOverflowing to false if user explicitely set hidden overflow

        this.axis.x.isOverflowing = elOverflowX === 'hidden' ? false : this.axis.x.isOverflowing;
        this.axis.y.isOverflowing = elOverflowY === 'hidden' ? false : this.axis.y.isOverflowing;
        this.axis.x.forceVisible = this.options.forceVisible === 'x' || this.options.forceVisible === true;
        this.axis.y.forceVisible = this.options.forceVisible === 'y' || this.options.forceVisible === true;
        this.hideNativeScrollbar(); // Set isOverflowing to false if scrollbar is not necessary (content is shorter than offset)

        var offsetForXScrollbar = this.axis.x.isOverflowing ? this.scrollbarWidth : 0;
        var offsetForYScrollbar = this.axis.y.isOverflowing ? this.scrollbarWidth : 0;
        this.axis.x.isOverflowing = this.axis.x.isOverflowing && contentElScrollWidth > contentWrapperElOffsetWidth - offsetForYScrollbar;
        this.axis.y.isOverflowing = this.axis.y.isOverflowing && contentElScrollHeight > contentWrapperElOffsetHeight - offsetForXScrollbar;
        this.axis.x.scrollbar.size = this.getScrollbarSize('x');
        this.axis.y.scrollbar.size = this.getScrollbarSize('y');
        this.axis.x.scrollbar.el.style.width = this.axis.x.scrollbar.size + "px";
        this.axis.y.scrollbar.el.style.height = this.axis.y.scrollbar.size + "px";
        this.positionScrollbar('x');
        this.positionScrollbar('y');
        this.toggleTrackVisibility('x');
        this.toggleTrackVisibility('y');
      }
      /**
       * Calculate scrollbar size
       */
      ;

      _proto.getScrollbarSize = function getScrollbarSize(axis) {
        if (axis === void 0) {
          axis = 'y';
        }

        if (!this.axis[axis].isOverflowing) {
          return 0;
        }

        var contentSize = this.contentEl[this.axis[axis].scrollSizeAttr];
        var trackSize = this.axis[axis].track.el[this.axis[axis].offsetSizeAttr];
        var scrollbarSize;
        var scrollbarRatio = trackSize / contentSize; // Calculate new height/position of drag handle.

        scrollbarSize = Math.max(~~(scrollbarRatio * trackSize), this.options.scrollbarMinSize);

        if (this.options.scrollbarMaxSize) {
          scrollbarSize = Math.min(scrollbarSize, this.options.scrollbarMaxSize);
        }

        return scrollbarSize;
      };

      _proto.positionScrollbar = function positionScrollbar(axis) {
        if (axis === void 0) {
          axis = 'y';
        }

        if (!this.axis[axis].isOverflowing) {
          return;
        }

        var contentSize = this.contentWrapperEl[this.axis[axis].scrollSizeAttr];
        var trackSize = this.axis[axis].track.el[this.axis[axis].offsetSizeAttr];
        var hostSize = parseInt(this.elStyles[this.axis[axis].sizeAttr], 10);
        var scrollbar = this.axis[axis].scrollbar;
        var scrollOffset = this.contentWrapperEl[this.axis[axis].scrollOffsetAttr];
        scrollOffset = axis === 'x' && this.isRtl && SimpleBar.getRtlHelpers().isScrollOriginAtZero ? -scrollOffset : scrollOffset;
        var scrollPourcent = scrollOffset / (contentSize - hostSize);
        var handleOffset = ~~((trackSize - scrollbar.size) * scrollPourcent);
        handleOffset = axis === 'x' && this.isRtl && SimpleBar.getRtlHelpers().isScrollingToNegative ? -handleOffset + (trackSize - scrollbar.size) : handleOffset;
        scrollbar.el.style.transform = axis === 'x' ? "translate3d(" + handleOffset + "px, 0, 0)" : "translate3d(0, " + handleOffset + "px, 0)";
      };

      _proto.toggleTrackVisibility = function toggleTrackVisibility(axis) {
        if (axis === void 0) {
          axis = 'y';
        }

        var track = this.axis[axis].track.el;
        var scrollbar = this.axis[axis].scrollbar.el;

        if (this.axis[axis].isOverflowing || this.axis[axis].forceVisible) {
          track.style.visibility = 'visible';
          this.contentWrapperEl.style[this.axis[axis].overflowAttr] = 'scroll';
          this.el.classList.add(this.classNames.scrollable + "-" + axis);
        } else {
          track.style.visibility = 'hidden';
          this.contentWrapperEl.style[this.axis[axis].overflowAttr] = 'hidden';
          this.el.classList.remove(this.classNames.scrollable + "-" + axis);
        } // Even if forceVisible is enabled, scrollbar itself should be hidden


        if (this.axis[axis].isOverflowing) {
          scrollbar.style.display = 'block';
        } else {
          scrollbar.style.display = 'none';
        }
      };

      _proto.hideNativeScrollbar = function hideNativeScrollbar() {
        this.offsetEl.style[this.isRtl ? 'left' : 'right'] = this.axis.y.isOverflowing || this.axis.y.forceVisible ? "-" + this.scrollbarWidth + "px" : 0;
        this.offsetEl.style.bottom = this.axis.x.isOverflowing || this.axis.x.forceVisible ? "-" + this.scrollbarWidth + "px" : 0;
      }
      /**
       * On scroll event handling
       */
      ;

      _proto.onMouseMoveForAxis = function onMouseMoveForAxis(axis) {
        if (axis === void 0) {
          axis = 'y';
        }

        this.axis[axis].track.rect = this.axis[axis].track.el.getBoundingClientRect();
        this.axis[axis].scrollbar.rect = this.axis[axis].scrollbar.el.getBoundingClientRect();
        var isWithinScrollbarBoundsX = this.isWithinBounds(this.axis[axis].scrollbar.rect);

        if (isWithinScrollbarBoundsX) {
          this.axis[axis].scrollbar.el.classList.add(this.classNames.hover);
        } else {
          this.axis[axis].scrollbar.el.classList.remove(this.classNames.hover);
        }

        if (this.isWithinBounds(this.axis[axis].track.rect)) {
          this.axis[axis].track.el.classList.add(this.classNames.hover);
        } else {
          this.axis[axis].track.el.classList.remove(this.classNames.hover);
        }
      };

      _proto.onMouseLeaveForAxis = function onMouseLeaveForAxis(axis) {
        if (axis === void 0) {
          axis = 'y';
        }

        this.axis[axis].track.el.classList.remove(this.classNames.hover);
        this.axis[axis].scrollbar.el.classList.remove(this.classNames.hover);
      };

      /**
       * on scrollbar handle drag movement starts
       */
      _proto.onDragStart = function onDragStart(e, axis) {
        if (axis === void 0) {
          axis = 'y';
        }

        var elDocument = getElementDocument(this.el);
        var elWindow = getElementWindow(this.el);
        var scrollbar = this.axis[axis].scrollbar; // Measure how far the user's mouse is from the top of the scrollbar drag handle.

        var eventOffset = axis === 'y' ? e.pageY : e.pageX;
        this.axis[axis].dragOffset = eventOffset - scrollbar.rect[this.axis[axis].offsetAttr];
        this.draggedAxis = axis;
        this.el.classList.add(this.classNames.dragging);
        elDocument.addEventListener('mousemove', this.drag, true);
        elDocument.addEventListener('mouseup', this.onEndDrag, true);

        if (this.removePreventClickId === null) {
          elDocument.addEventListener('click', this.preventClick, true);
          elDocument.addEventListener('dblclick', this.preventClick, true);
        } else {
          elWindow.clearTimeout(this.removePreventClickId);
          this.removePreventClickId = null;
        }
      }
      /**
       * Drag scrollbar handle
       */
      ;

      _proto.onTrackClick = function onTrackClick(e, axis) {
        var _this4 = this;

        if (axis === void 0) {
          axis = 'y';
        }

        if (!this.options.clickOnTrack) return;
        var elWindow = getElementWindow(this.el);
        this.axis[axis].scrollbar.rect = this.axis[axis].scrollbar.el.getBoundingClientRect();
        var scrollbar = this.axis[axis].scrollbar;
        var scrollbarOffset = scrollbar.rect[this.axis[axis].offsetAttr];
        var hostSize = parseInt(this.elStyles[this.axis[axis].sizeAttr], 10);
        var scrolled = this.contentWrapperEl[this.axis[axis].scrollOffsetAttr];
        var t = axis === 'y' ? this.mouseY - scrollbarOffset : this.mouseX - scrollbarOffset;
        var dir = t < 0 ? -1 : 1;
        var scrollSize = dir === -1 ? scrolled - hostSize : scrolled + hostSize;
        var speed = 40;

        var scrollTo = function scrollTo() {
          if (dir === -1) {
            if (scrolled > scrollSize) {
              var _this4$contentWrapper;

              scrolled -= speed;

              _this4.contentWrapperEl.scrollTo((_this4$contentWrapper = {}, _this4$contentWrapper[_this4.axis[axis].offsetAttr] = scrolled, _this4$contentWrapper));

              elWindow.requestAnimationFrame(scrollTo);
            }
          } else {
            if (scrolled < scrollSize) {
              var _this4$contentWrapper2;

              scrolled += speed;

              _this4.contentWrapperEl.scrollTo((_this4$contentWrapper2 = {}, _this4$contentWrapper2[_this4.axis[axis].offsetAttr] = scrolled, _this4$contentWrapper2));

              elWindow.requestAnimationFrame(scrollTo);
            }
          }
        };

        scrollTo();
      }
      /**
       * Getter for content element
       */
      ;

      _proto.getContentElement = function getContentElement() {
        return this.contentEl;
      }
      /**
       * Getter for original scrolling element
       */
      ;

      _proto.getScrollElement = function getScrollElement() {
        return this.contentWrapperEl;
      };

      _proto.getScrollbarWidth = function getScrollbarWidth() {
        // Try/catch for FF 56 throwing on undefined computedStyles
        try {
          // Detect browsers supporting CSS scrollbar styling and do not calculate
          if (getComputedStyle(this.contentWrapperEl, '::-webkit-scrollbar').display === 'none' || 'scrollbarWidth' in document.documentElement.style || '-ms-overflow-style' in document.documentElement.style) {
            return 0;
          } else {
            return scrollbarWidth();
          }
        } catch (e) {
          return scrollbarWidth();
        }
      };

      _proto.removeListeners = function removeListeners() {
        var _this5 = this;

        var elWindow = getElementWindow(this.el); // Event listeners

        this.el.removeEventListener('mouseenter', this.onMouseEnter);
        ['mousedown', 'click', 'dblclick'].forEach(function (e) {
          _this5.el.removeEventListener(e, _this5.onPointerEvent, true);
        });
        ['touchstart', 'touchend', 'touchmove'].forEach(function (e) {
          _this5.el.removeEventListener(e, _this5.onPointerEvent, {
            capture: true,
            passive: true
          });
        });
        this.el.removeEventListener('mousemove', this.onMouseMove);
        this.el.removeEventListener('mouseleave', this.onMouseLeave);
        this.contentWrapperEl.removeEventListener('scroll', this.onScroll);
        elWindow.removeEventListener('resize', this.onWindowResize);
        this.mutationObserver.disconnect();

        if (this.resizeObserver) {
          this.resizeObserver.disconnect();
        } // Cancel all debounced functions


        this.recalculate.cancel();
        this.onMouseMove.cancel();
        this.onWindowResize.cancel();
        this.onStopScrolling.cancel();
        this.onMouseEntered.cancel();
      }
      /**
       * UnMount mutation observer and delete SimpleBar instance from DOM element
       */
      ;

      _proto.unMount = function unMount() {
        this.removeListeners();
        SimpleBar.instances.delete(this.el);
      }
      /**
       * Check if mouse is within bounds
       */
      ;

      _proto.isWithinBounds = function isWithinBounds(bbox) {
        return this.mouseX >= bbox.left && this.mouseX <= bbox.left + bbox.width && this.mouseY >= bbox.top && this.mouseY <= bbox.top + bbox.height;
      }
      /**
       * Find element children matches query
       */
      ;

      _proto.findChild = function findChild(el, query) {
        var matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
        return Array.prototype.filter.call(el.children, function (child) {
          return matches.call(child, query);
        })[0];
      };

      return SimpleBar;
    }();

    SimpleBar.defaultOptions = {
      autoHide: true,
      forceVisible: false,
      clickOnTrack: true,
      classNames: {
        contentEl: 'simplebar-content',
        contentWrapper: 'simplebar-content-wrapper',
        offset: 'simplebar-offset',
        mask: 'simplebar-mask',
        wrapper: 'simplebar-wrapper',
        placeholder: 'simplebar-placeholder',
        scrollbar: 'simplebar-scrollbar',
        track: 'simplebar-track',
        heightAutoObserverWrapperEl: 'simplebar-height-auto-observer-wrapper',
        heightAutoObserverEl: 'simplebar-height-auto-observer',
        visible: 'simplebar-visible',
        horizontal: 'simplebar-horizontal',
        vertical: 'simplebar-vertical',
        hover: 'simplebar-hover',
        dragging: 'simplebar-dragging',
        scrolling: 'simplebar-scrolling',
        scrollable: 'simplebar-scrollable',
        mouseEntered: 'simplebar-mouse-entered'
      },
      scrollbarMinSize: 25,
      scrollbarMaxSize: 0
    };
    SimpleBar.instances = new WeakMap();

    // `Array.prototype.{ reduce, reduceRight }` methods implementation
    var createMethod$3 = function (IS_RIGHT) {
      return function (that, callbackfn, argumentsLength, memo) {
        aFunction$1(callbackfn);
        var O = toObject(that);
        var self = indexedObject(O);
        var length = toLength(O.length);
        var index = IS_RIGHT ? length - 1 : 0;
        var i = IS_RIGHT ? -1 : 1;
        if (argumentsLength < 2) while (true) {
          if (index in self) {
            memo = self[index];
            index += i;
            break;
          }
          index += i;
          if (IS_RIGHT ? index < 0 : length <= index) {
            throw TypeError('Reduce of empty array with no initial value');
          }
        }
        for (;IS_RIGHT ? index >= 0 : length > index; index += i) if (index in self) {
          memo = callbackfn(memo, self[index], index, O);
        }
        return memo;
      };
    };

    var arrayReduce = {
      // `Array.prototype.reduce` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.reduce
      left: createMethod$3(false),
      // `Array.prototype.reduceRight` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.reduceright
      right: createMethod$3(true)
    };

    var $reduce = arrayReduce.left;



    var STRICT_METHOD$1 = arrayMethodIsStrict('reduce');
    var USES_TO_LENGTH$2 = arrayMethodUsesToLength('reduce', { 1: 0 });

    // `Array.prototype.reduce` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.reduce
    _export({ target: 'Array', proto: true, forced: !STRICT_METHOD$1 || !USES_TO_LENGTH$2 }, {
      reduce: function reduce(callbackfn /* , initialValue */) {
        return $reduce(this, callbackfn, arguments.length, arguments.length > 1 ? arguments[1] : undefined);
      }
    });

    var defineProperty$3 = objectDefineProperty.f;

    var FunctionPrototype = Function.prototype;
    var FunctionPrototypeToString = FunctionPrototype.toString;
    var nameRE = /^\s*function ([^ (]*)/;
    var NAME = 'name';

    // Function instances `.name` property
    // https://tc39.github.io/ecma262/#sec-function-instances-name
    if (descriptors && !(NAME in FunctionPrototype)) {
      defineProperty$3(FunctionPrototype, NAME, {
        configurable: true,
        get: function () {
          try {
            return FunctionPrototypeToString.call(this).match(nameRE)[1];
          } catch (error) {
            return '';
          }
        }
      });
    }

    // `RegExp.prototype.flags` getter implementation
    // https://tc39.github.io/ecma262/#sec-get-regexp.prototype.flags
    var regexpFlags = function () {
      var that = anObject(this);
      var result = '';
      if (that.global) result += 'g';
      if (that.ignoreCase) result += 'i';
      if (that.multiline) result += 'm';
      if (that.dotAll) result += 's';
      if (that.unicode) result += 'u';
      if (that.sticky) result += 'y';
      return result;
    };

    // babel-minify transpiles RegExp('a', 'y') -> /a/y and it causes SyntaxError,
    // so we use an intermediate function.
    function RE(s, f) {
      return RegExp(s, f);
    }

    var UNSUPPORTED_Y = fails(function () {
      // babel-minify transpiles RegExp('a', 'y') -> /a/y and it causes SyntaxError
      var re = RE('a', 'y');
      re.lastIndex = 2;
      return re.exec('abcd') != null;
    });

    var BROKEN_CARET = fails(function () {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=773687
      var re = RE('^r', 'gy');
      re.lastIndex = 2;
      return re.exec('str') != null;
    });

    var regexpStickyHelpers = {
    	UNSUPPORTED_Y: UNSUPPORTED_Y,
    	BROKEN_CARET: BROKEN_CARET
    };

    var nativeExec = RegExp.prototype.exec;
    // This always refers to the native implementation, because the
    // String#replace polyfill uses ./fix-regexp-well-known-symbol-logic.js,
    // which loads this file before patching the method.
    var nativeReplace = String.prototype.replace;

    var patchedExec = nativeExec;

    var UPDATES_LAST_INDEX_WRONG = (function () {
      var re1 = /a/;
      var re2 = /b*/g;
      nativeExec.call(re1, 'a');
      nativeExec.call(re2, 'a');
      return re1.lastIndex !== 0 || re2.lastIndex !== 0;
    })();

    var UNSUPPORTED_Y$1 = regexpStickyHelpers.UNSUPPORTED_Y || regexpStickyHelpers.BROKEN_CARET;

    // nonparticipating capturing group, copied from es5-shim's String#split patch.
    var NPCG_INCLUDED = /()??/.exec('')[1] !== undefined;

    var PATCH = UPDATES_LAST_INDEX_WRONG || NPCG_INCLUDED || UNSUPPORTED_Y$1;

    if (PATCH) {
      patchedExec = function exec(str) {
        var re = this;
        var lastIndex, reCopy, match, i;
        var sticky = UNSUPPORTED_Y$1 && re.sticky;
        var flags = regexpFlags.call(re);
        var source = re.source;
        var charsAdded = 0;
        var strCopy = str;

        if (sticky) {
          flags = flags.replace('y', '');
          if (flags.indexOf('g') === -1) {
            flags += 'g';
          }

          strCopy = String(str).slice(re.lastIndex);
          // Support anchored sticky behavior.
          if (re.lastIndex > 0 && (!re.multiline || re.multiline && str[re.lastIndex - 1] !== '\n')) {
            source = '(?: ' + source + ')';
            strCopy = ' ' + strCopy;
            charsAdded++;
          }
          // ^(? + rx + ) is needed, in combination with some str slicing, to
          // simulate the 'y' flag.
          reCopy = new RegExp('^(?:' + source + ')', flags);
        }

        if (NPCG_INCLUDED) {
          reCopy = new RegExp('^' + source + '$(?!\\s)', flags);
        }
        if (UPDATES_LAST_INDEX_WRONG) lastIndex = re.lastIndex;

        match = nativeExec.call(sticky ? reCopy : re, strCopy);

        if (sticky) {
          if (match) {
            match.input = match.input.slice(charsAdded);
            match[0] = match[0].slice(charsAdded);
            match.index = re.lastIndex;
            re.lastIndex += match[0].length;
          } else re.lastIndex = 0;
        } else if (UPDATES_LAST_INDEX_WRONG && match) {
          re.lastIndex = re.global ? match.index + match[0].length : lastIndex;
        }
        if (NPCG_INCLUDED && match && match.length > 1) {
          // Fix browsers whose `exec` methods don't consistently return `undefined`
          // for NPCG, like IE8. NOTE: This doesn' work for /(.?)?/
          nativeReplace.call(match[0], reCopy, function () {
            for (i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undefined) match[i] = undefined;
            }
          });
        }

        return match;
      };
    }

    var regexpExec = patchedExec;

    _export({ target: 'RegExp', proto: true, forced: /./.exec !== regexpExec }, {
      exec: regexpExec
    });

    // TODO: Remove from `core-js@4` since it's moved to entry points







    var SPECIES$2 = wellKnownSymbol('species');

    var REPLACE_SUPPORTS_NAMED_GROUPS = !fails(function () {
      // #replace needs built-in support for named groups.
      // #match works fine because it just return the exec results, even if it has
      // a "grops" property.
      var re = /./;
      re.exec = function () {
        var result = [];
        result.groups = { a: '7' };
        return result;
      };
      return ''.replace(re, '$<a>') !== '7';
    });

    // IE <= 11 replaces $0 with the whole match, as if it was $&
    // https://stackoverflow.com/questions/6024666/getting-ie-to-replace-a-regex-with-the-literal-string-0
    var REPLACE_KEEPS_$0 = (function () {
      return 'a'.replace(/./, '$0') === '$0';
    })();

    var REPLACE = wellKnownSymbol('replace');
    // Safari <= 13.0.3(?) substitutes nth capture where n>m with an empty string
    var REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE = (function () {
      if (/./[REPLACE]) {
        return /./[REPLACE]('a', '$0') === '';
      }
      return false;
    })();

    // Chrome 51 has a buggy "split" implementation when RegExp#exec !== nativeExec
    // Weex JS has frozen built-in prototypes, so use try / catch wrapper
    var SPLIT_WORKS_WITH_OVERWRITTEN_EXEC = !fails(function () {
      var re = /(?:)/;
      var originalExec = re.exec;
      re.exec = function () { return originalExec.apply(this, arguments); };
      var result = 'ab'.split(re);
      return result.length !== 2 || result[0] !== 'a' || result[1] !== 'b';
    });

    var fixRegexpWellKnownSymbolLogic = function (KEY, length, exec, sham) {
      var SYMBOL = wellKnownSymbol(KEY);

      var DELEGATES_TO_SYMBOL = !fails(function () {
        // String methods call symbol-named RegEp methods
        var O = {};
        O[SYMBOL] = function () { return 7; };
        return ''[KEY](O) != 7;
      });

      var DELEGATES_TO_EXEC = DELEGATES_TO_SYMBOL && !fails(function () {
        // Symbol-named RegExp methods call .exec
        var execCalled = false;
        var re = /a/;

        if (KEY === 'split') {
          // We can't use real regex here since it causes deoptimization
          // and serious performance degradation in V8
          // https://github.com/zloirock/core-js/issues/306
          re = {};
          // RegExp[@@split] doesn't call the regex's exec method, but first creates
          // a new one. We need to return the patched regex when creating the new one.
          re.constructor = {};
          re.constructor[SPECIES$2] = function () { return re; };
          re.flags = '';
          re[SYMBOL] = /./[SYMBOL];
        }

        re.exec = function () { execCalled = true; return null; };

        re[SYMBOL]('');
        return !execCalled;
      });

      if (
        !DELEGATES_TO_SYMBOL ||
        !DELEGATES_TO_EXEC ||
        (KEY === 'replace' && !(
          REPLACE_SUPPORTS_NAMED_GROUPS &&
          REPLACE_KEEPS_$0 &&
          !REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE
        )) ||
        (KEY === 'split' && !SPLIT_WORKS_WITH_OVERWRITTEN_EXEC)
      ) {
        var nativeRegExpMethod = /./[SYMBOL];
        var methods = exec(SYMBOL, ''[KEY], function (nativeMethod, regexp, str, arg2, forceStringMethod) {
          if (regexp.exec === regexpExec) {
            if (DELEGATES_TO_SYMBOL && !forceStringMethod) {
              // The native String method already delegates to @@method (this
              // polyfilled function), leasing to infinite recursion.
              // We avoid it by directly calling the native @@method method.
              return { done: true, value: nativeRegExpMethod.call(regexp, str, arg2) };
            }
            return { done: true, value: nativeMethod.call(str, regexp, arg2) };
          }
          return { done: false };
        }, {
          REPLACE_KEEPS_$0: REPLACE_KEEPS_$0,
          REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE: REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE
        });
        var stringMethod = methods[0];
        var regexMethod = methods[1];

        redefine(String.prototype, KEY, stringMethod);
        redefine(RegExp.prototype, SYMBOL, length == 2
          // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
          // 21.2.5.11 RegExp.prototype[@@split](string, limit)
          ? function (string, arg) { return regexMethod.call(string, this, arg); }
          // 21.2.5.6 RegExp.prototype[@@match](string)
          // 21.2.5.9 RegExp.prototype[@@search](string)
          : function (string) { return regexMethod.call(string, this); }
        );
      }

      if (sham) createNonEnumerableProperty(RegExp.prototype[SYMBOL], 'sham', true);
    };

    var charAt$1 = stringMultibyte.charAt;

    // `AdvanceStringIndex` abstract operation
    // https://tc39.github.io/ecma262/#sec-advancestringindex
    var advanceStringIndex = function (S, index, unicode) {
      return index + (unicode ? charAt$1(S, index).length : 1);
    };

    // `RegExpExec` abstract operation
    // https://tc39.github.io/ecma262/#sec-regexpexec
    var regexpExecAbstract = function (R, S) {
      var exec = R.exec;
      if (typeof exec === 'function') {
        var result = exec.call(R, S);
        if (typeof result !== 'object') {
          throw TypeError('RegExp exec method returned something other than an Object or null');
        }
        return result;
      }

      if (classofRaw(R) !== 'RegExp') {
        throw TypeError('RegExp#exec called on incompatible receiver');
      }

      return regexpExec.call(R, S);
    };

    // @@match logic
    fixRegexpWellKnownSymbolLogic('match', 1, function (MATCH, nativeMatch, maybeCallNative) {
      return [
        // `String.prototype.match` method
        // https://tc39.github.io/ecma262/#sec-string.prototype.match
        function match(regexp) {
          var O = requireObjectCoercible(this);
          var matcher = regexp == undefined ? undefined : regexp[MATCH];
          return matcher !== undefined ? matcher.call(regexp, O) : new RegExp(regexp)[MATCH](String(O));
        },
        // `RegExp.prototype[@@match]` method
        // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@match
        function (regexp) {
          var res = maybeCallNative(nativeMatch, regexp, this);
          if (res.done) return res.value;

          var rx = anObject(regexp);
          var S = String(this);

          if (!rx.global) return regexpExecAbstract(rx, S);

          var fullUnicode = rx.unicode;
          rx.lastIndex = 0;
          var A = [];
          var n = 0;
          var result;
          while ((result = regexpExecAbstract(rx, S)) !== null) {
            var matchStr = String(result[0]);
            A[n] = matchStr;
            if (matchStr === '') rx.lastIndex = advanceStringIndex(S, toLength(rx.lastIndex), fullUnicode);
            n++;
          }
          return n === 0 ? null : A;
        }
      ];
    });

    var max$1 = Math.max;
    var min$2 = Math.min;
    var floor$1 = Math.floor;
    var SUBSTITUTION_SYMBOLS = /\$([$&'`]|\d\d?|<[^>]*>)/g;
    var SUBSTITUTION_SYMBOLS_NO_NAMED = /\$([$&'`]|\d\d?)/g;

    var maybeToString = function (it) {
      return it === undefined ? it : String(it);
    };

    // @@replace logic
    fixRegexpWellKnownSymbolLogic('replace', 2, function (REPLACE, nativeReplace, maybeCallNative, reason) {
      var REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE = reason.REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE;
      var REPLACE_KEEPS_$0 = reason.REPLACE_KEEPS_$0;
      var UNSAFE_SUBSTITUTE = REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE ? '$' : '$0';

      return [
        // `String.prototype.replace` method
        // https://tc39.github.io/ecma262/#sec-string.prototype.replace
        function replace(searchValue, replaceValue) {
          var O = requireObjectCoercible(this);
          var replacer = searchValue == undefined ? undefined : searchValue[REPLACE];
          return replacer !== undefined
            ? replacer.call(searchValue, O, replaceValue)
            : nativeReplace.call(String(O), searchValue, replaceValue);
        },
        // `RegExp.prototype[@@replace]` method
        // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@replace
        function (regexp, replaceValue) {
          if (
            (!REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE && REPLACE_KEEPS_$0) ||
            (typeof replaceValue === 'string' && replaceValue.indexOf(UNSAFE_SUBSTITUTE) === -1)
          ) {
            var res = maybeCallNative(nativeReplace, regexp, this, replaceValue);
            if (res.done) return res.value;
          }

          var rx = anObject(regexp);
          var S = String(this);

          var functionalReplace = typeof replaceValue === 'function';
          if (!functionalReplace) replaceValue = String(replaceValue);

          var global = rx.global;
          if (global) {
            var fullUnicode = rx.unicode;
            rx.lastIndex = 0;
          }
          var results = [];
          while (true) {
            var result = regexpExecAbstract(rx, S);
            if (result === null) break;

            results.push(result);
            if (!global) break;

            var matchStr = String(result[0]);
            if (matchStr === '') rx.lastIndex = advanceStringIndex(S, toLength(rx.lastIndex), fullUnicode);
          }

          var accumulatedResult = '';
          var nextSourcePosition = 0;
          for (var i = 0; i < results.length; i++) {
            result = results[i];

            var matched = String(result[0]);
            var position = max$1(min$2(toInteger(result.index), S.length), 0);
            var captures = [];
            // NOTE: This is equivalent to
            //   captures = result.slice(1).map(maybeToString)
            // but for some reason `nativeSlice.call(result, 1, result.length)` (called in
            // the slice polyfill when slicing native arrays) "doesn't work" in safari 9 and
            // causes a crash (https://pastebin.com/N21QzeQA) when trying to debug it.
            for (var j = 1; j < result.length; j++) captures.push(maybeToString(result[j]));
            var namedCaptures = result.groups;
            if (functionalReplace) {
              var replacerArgs = [matched].concat(captures, position, S);
              if (namedCaptures !== undefined) replacerArgs.push(namedCaptures);
              var replacement = String(replaceValue.apply(undefined, replacerArgs));
            } else {
              replacement = getSubstitution(matched, S, position, captures, namedCaptures, replaceValue);
            }
            if (position >= nextSourcePosition) {
              accumulatedResult += S.slice(nextSourcePosition, position) + replacement;
              nextSourcePosition = position + matched.length;
            }
          }
          return accumulatedResult + S.slice(nextSourcePosition);
        }
      ];

      // https://tc39.github.io/ecma262/#sec-getsubstitution
      function getSubstitution(matched, str, position, captures, namedCaptures, replacement) {
        var tailPos = position + matched.length;
        var m = captures.length;
        var symbols = SUBSTITUTION_SYMBOLS_NO_NAMED;
        if (namedCaptures !== undefined) {
          namedCaptures = toObject(namedCaptures);
          symbols = SUBSTITUTION_SYMBOLS;
        }
        return nativeReplace.call(replacement, symbols, function (match, ch) {
          var capture;
          switch (ch.charAt(0)) {
            case '$': return '$';
            case '&': return matched;
            case '`': return str.slice(0, position);
            case "'": return str.slice(tailPos);
            case '<':
              capture = namedCaptures[ch.slice(1, -1)];
              break;
            default: // \d\d?
              var n = +ch;
              if (n === 0) return match;
              if (n > m) {
                var f = floor$1(n / 10);
                if (f === 0) return match;
                if (f <= m) return captures[f - 1] === undefined ? ch.charAt(1) : captures[f - 1] + ch.charAt(1);
                return match;
              }
              capture = captures[n - 1];
          }
          return capture === undefined ? '' : capture;
        });
      }
    });

    /**
     * SimpleBar.js - v6.0.0-beta.2
     * Scrollbars, simpler.
     * https://grsmto.github.io/simplebar/
     *
     * Made by Adrien Denat from a fork by Jonathan Nicol
     * Under MIT License
     */

    // Helper function to retrieve options from element attributes
    var getOptions = function getOptions(obj) {
      var options = Array.prototype.reduce.call(obj, function (acc, attribute) {
        var option = attribute.name.match(/data-simplebar-(.+)/);

        if (option) {
          var key = option[1].replace(/\W+(.)/g, function (x, chr) {
            return chr.toUpperCase();
          });

          switch (attribute.value) {
            case 'true':
              acc[key] = true;
              break;

            case 'false':
              acc[key] = false;
              break;

            case undefined:
              acc[key] = true;
              break;

            default:
              acc[key] = attribute.value;
          }
        }

        return acc;
      }, {});
      return options;
    };

    SimpleBar.initDOMLoadedElements = function () {
      document.removeEventListener('DOMContentLoaded', this.initDOMLoadedElements);
      window.removeEventListener('load', this.initDOMLoadedElements);
      Array.prototype.forEach.call(document.querySelectorAll('[data-simplebar]'), function (el) {
        if (el.getAttribute('data-simplebar') !== 'init' && !SimpleBar.instances.has(el)) new SimpleBar(el, getOptions(el.attributes));
      });
    };

    SimpleBar.removeObserver = function () {
      this.globalObserver.disconnect();
    };

    SimpleBar.initHtmlApi = function () {
      this.initDOMLoadedElements = this.initDOMLoadedElements.bind(this); // MutationObserver is IE11+

      if (typeof MutationObserver !== 'undefined') {
        // Mutation observer to observe dynamically added elements
        this.globalObserver = new MutationObserver(SimpleBar.handleMutations);
        this.globalObserver.observe(document, {
          childList: true,
          subtree: true
        });
      } // Taken from jQuery `ready` function
      // Instantiate elements already present on the page


      if (document.readyState === 'complete' || document.readyState !== 'loading' && !document.documentElement.doScroll) {
        // Handle it asynchronously to allow scripts the opportunity to delay init
        window.setTimeout(this.initDOMLoadedElements);
      } else {
        document.addEventListener('DOMContentLoaded', this.initDOMLoadedElements);
        window.addEventListener('load', this.initDOMLoadedElements);
      }
    };

    SimpleBar.handleMutations = function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes, function (addedNode) {
          if (addedNode.nodeType === 1) {
            if (addedNode.hasAttribute('data-simplebar')) {
              !SimpleBar.instances.has(addedNode) && new SimpleBar(addedNode, getOptions(addedNode.attributes));
            } else {
              Array.prototype.forEach.call(addedNode.querySelectorAll('[data-simplebar]'), function (el) {
                if (el.getAttribute('data-simplebar') !== 'init' && !SimpleBar.instances.has(el)) new SimpleBar(el, getOptions(el.attributes));
              });
            }
          }
        });
        Array.prototype.forEach.call(mutation.removedNodes, function (removedNode) {
          if (removedNode.nodeType === 1) {
            if (removedNode.hasAttribute('[data-simplebar="init"]')) {
              SimpleBar.instances.has(removedNode) && SimpleBar.instances.get(removedNode).unMount();
            } else {
              Array.prototype.forEach.call(removedNode.querySelectorAll('[data-simplebar="init"]'), function (el) {
                SimpleBar.instances.has(el) && SimpleBar.instances.get(el).unMount();
              });
            }
          }
        });
      });
    };

    SimpleBar.getOptions = getOptions;
    /**
     * HTML API
     * Called only in a browser env.
     */

    if (canUseDom) {
      SimpleBar.initHtmlApi();
    }

    /* src/components/SimpleBar.svelte generated by Svelte v3.24.1 */
    const file = "src/components/SimpleBar.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-zxy9r9-style";
    	style.textContent = ".simplebar-track{right:-10px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2ltcGxlQmFyLnN2ZWx0ZSIsInNvdXJjZXMiOlsiU2ltcGxlQmFyLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuICBpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSBcInN2ZWx0ZVwiO1xuICBpbXBvcnQgU2ltcGxlQmFyIGZyb20gXCJzaW1wbGViYXJcIjtcbiAgaW1wb3J0IFwic2ltcGxlYmFyL2Rpc3Qvc2ltcGxlYmFyLmNzc1wiO1xuXG4gIGV4cG9ydCBsZXQgbWF4SGVpZ2h0ID0gXCIzMDBweFwiO1xuICBsZXQgY29udGFpbmVyO1xuICBsZXQgc2Nyb2xsRWxlbWVudDtcbiAgbGV0IGNvbnRlbnRFbGVtZW50O1xuXG4gIG9uTW91bnQoYXN5bmMgKCkgPT4ge1xuICAgIG5ldyBTaW1wbGVCYXIoY29udGFpbmVyKTtcbiAgfSk7XG48L3NjcmlwdD5cblxuPHN0eWxlIGdsb2JhbD5cbiAgOmdsb2JhbCguc2ltcGxlYmFyLXRyYWNrKSB7XG4gICAgcmlnaHQ6IC0xMHB4O1xuICB9XG48L3N0eWxlPlxuXG48ZGl2IHN0eWxlPVwibWF4LWhlaWdodDoge21heEhlaWdodH1cIiBiaW5kOnRoaXM9e2NvbnRhaW5lcn0+XG4gIDxkaXYgY2xhc3M9XCJzaW1wbGViYXItd3JhcHBlclwiPlxuICAgIDxkaXYgY2xhc3M9XCJzaW1wbGViYXItaGVpZ2h0LWF1dG8tb2JzZXJ2ZXItd3JhcHBlclwiPlxuICAgICAgPGRpdiBjbGFzcz1cInNpbXBsZWJhci1oZWlnaHQtYXV0by1vYnNlcnZlclwiIC8+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cInNpbXBsZWJhci1tYXNrXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwic2ltcGxlYmFyLW9mZnNldFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwic2ltcGxlYmFyLWNvbnRlbnQtd3JhcHBlclwiIGJpbmQ6dGhpcz17c2Nyb2xsRWxlbWVudH0+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInNpbXBsZWJhci1jb250ZW50XCIgYmluZDp0aGlzPXtjb250ZW50RWxlbWVudH0+XG4gICAgICAgICAgICA8c2xvdCAvPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJzaW1wbGViYXItcGxhY2Vob2xkZXJcIiAvPlxuICA8L2Rpdj5cbiAgPGRpdiBjbGFzcz1cInNpbXBsZWJhci10cmFjayBzaW1wbGViYXItaG9yaXpvbnRhbFwiPlxuICAgIDxkaXYgY2xhc3M9XCJzaW1wbGViYXItc2Nyb2xsYmFyXCIgLz5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJzaW1wbGViYXItdHJhY2sgc2ltcGxlYmFyLXZlcnRpY2FsXCI+XG4gICAgPGRpdiBjbGFzcz1cInNpbXBsZWJhci1zY3JvbGxiYXJcIiAvPlxuICA8L2Rpdj5cbjwvZGl2PlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWdCVSxnQkFBZ0IsQUFBRSxDQUFDLEFBQ3pCLEtBQUssQ0FBRSxLQUFLLEFBQ2QsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function create_fragment(ctx) {
    	let div12;
    	let div7;
    	let div1;
    	let div0;
    	let t0;
    	let div5;
    	let div4;
    	let div3;
    	let div2;
    	let t1;
    	let div6;
    	let t2;
    	let div9;
    	let div8;
    	let t3;
    	let div11;
    	let div10;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			div7 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			if (default_slot) default_slot.c();
    			t1 = space();
    			div6 = element("div");
    			t2 = space();
    			div9 = element("div");
    			div8 = element("div");
    			t3 = space();
    			div11 = element("div");
    			div10 = element("div");
    			attr_dev(div0, "class", "simplebar-height-auto-observer");
    			add_location(div0, file, 24, 6, 524);
    			attr_dev(div1, "class", "simplebar-height-auto-observer-wrapper");
    			add_location(div1, file, 23, 4, 465);
    			attr_dev(div2, "class", "simplebar-content");
    			add_location(div2, file, 29, 10, 736);
    			attr_dev(div3, "class", "simplebar-content-wrapper");
    			add_location(div3, file, 28, 8, 660);
    			attr_dev(div4, "class", "simplebar-offset");
    			add_location(div4, file, 27, 6, 621);
    			attr_dev(div5, "class", "simplebar-mask");
    			add_location(div5, file, 26, 4, 586);
    			attr_dev(div6, "class", "simplebar-placeholder");
    			add_location(div6, file, 35, 4, 876);
    			attr_dev(div7, "class", "simplebar-wrapper");
    			add_location(div7, file, 22, 2, 429);
    			attr_dev(div8, "class", "simplebar-scrollbar");
    			add_location(div8, file, 38, 4, 980);
    			attr_dev(div9, "class", "simplebar-track simplebar-horizontal");
    			add_location(div9, file, 37, 2, 925);
    			attr_dev(div10, "class", "simplebar-scrollbar");
    			add_location(div10, file, 41, 4, 1080);
    			attr_dev(div11, "class", "simplebar-track simplebar-vertical");
    			add_location(div11, file, 40, 2, 1027);
    			set_style(div12, "max-height", /*maxHeight*/ ctx[0]);
    			add_location(div12, file, 21, 0, 367);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div7);
    			append_dev(div7, div1);
    			append_dev(div1, div0);
    			append_dev(div7, t0);
    			append_dev(div7, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div2);

    			if (default_slot) {
    				default_slot.m(div2, null);
    			}

    			/*div2_binding*/ ctx[6](div2);
    			/*div3_binding*/ ctx[7](div3);
    			append_dev(div7, t1);
    			append_dev(div7, div6);
    			append_dev(div12, t2);
    			append_dev(div12, div9);
    			append_dev(div9, div8);
    			append_dev(div12, t3);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			/*div12_binding*/ ctx[8](div12);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*maxHeight*/ 1) {
    				set_style(div12, "max-height", /*maxHeight*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			if (default_slot) default_slot.d(detaching);
    			/*div2_binding*/ ctx[6](null);
    			/*div3_binding*/ ctx[7](null);
    			/*div12_binding*/ ctx[8](null);
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
    	let { maxHeight = "300px" } = $$props;
    	let container;
    	let scrollElement;
    	let contentElement;

    	onMount(async () => {
    		new SimpleBar(container);
    	});

    	const writable_props = ["maxHeight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SimpleBar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("SimpleBar", $$slots, ['default']);

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			contentElement = $$value;
    			$$invalidate(3, contentElement);
    		});
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			scrollElement = $$value;
    			$$invalidate(2, scrollElement);
    		});
    	}

    	function div12_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(1, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("maxHeight" in $$props) $$invalidate(0, maxHeight = $$props.maxHeight);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		SimpleBar,
    		maxHeight,
    		container,
    		scrollElement,
    		contentElement
    	});

    	$$self.$inject_state = $$props => {
    		if ("maxHeight" in $$props) $$invalidate(0, maxHeight = $$props.maxHeight);
    		if ("container" in $$props) $$invalidate(1, container = $$props.container);
    		if ("scrollElement" in $$props) $$invalidate(2, scrollElement = $$props.scrollElement);
    		if ("contentElement" in $$props) $$invalidate(3, contentElement = $$props.contentElement);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		maxHeight,
    		container,
    		scrollElement,
    		contentElement,
    		$$scope,
    		$$slots,
    		div2_binding,
    		div3_binding,
    		div12_binding
    	];
    }

    class SimpleBar_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-zxy9r9-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { maxHeight: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SimpleBar_1",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get maxHeight() {
    		throw new Error("<SimpleBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxHeight(value) {
    		throw new Error("<SimpleBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
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

    /* src/components/sidebar.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;
    const file$1 = "src/components/sidebar.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-5tmqxj-style";
    	style.textContent = ".sidebar.svelte-5tmqxj.svelte-5tmqxj{background:rgba(0, 0, 0, 0.1);width:250px;height:100vh;color:#fff;box-sizing:border-box;padding:40px 15px 15px;-webkit-app-region:drag;-webkit-user-select:none;position:sticky;top:0}.sidebarList__title.svelte-5tmqxj.svelte-5tmqxj{font-size:11px;font-weight:500;letter-spacing:0.5px;color:rgba(255, 255, 255, 0.2);display:block}.sidebarList__item.svelte-5tmqxj.svelte-5tmqxj{text-align:left;width:100%;border:none;color:#fff;padding:7px 15px;background-color:transparent;border-radius:7px;font-size:14px;position:relative;display:block;height:30px;line-height:normal;transition:all 0.3s ease-in-out;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sidebarList__item.svelte-5tmqxj span.svelte-5tmqxj{float:right;background-color:rgba(255, 255, 255, 0.1);color:#fff;padding:1px 5px 0;border-radius:50px;font-size:12px;transition:all 0.3s ease-in-out}.sidebarList__item.svelte-5tmqxj:hover .ui__iconGlobal.svelte-5tmqxj{fill:red}.sidebarList__item.svelte-5tmqxj:hover .ui__iconProject.svelte-5tmqxj{fill:#fff}.sidebarList__item.active.svelte-5tmqxj.svelte-5tmqxj{background-color:rgba(255, 255, 255, 0.1);padding-right:30px}.sidebarList__item.active.svelte-5tmqxj span.svelte-5tmqxj{background-color:rgba(255, 255, 255, 0.2)}.sidebarList__item.active.svelte-5tmqxj .sidebarList__itemRemove.svelte-5tmqxj{opacity:1}.sidebarList__item.active.svelte-5tmqxj .ui__iconGlobal.svelte-5tmqxj{fill:red}.sidebarList__item.active.svelte-5tmqxj .ui__iconProject.svelte-5tmqxj{fill:#fff}.sidebarList__itemRemove.svelte-5tmqxj.svelte-5tmqxj{opacity:0;transition:all 0.3s ease-in-out;position:absolute;background-color:rgba(255, 255, 255, 0.1);width:20px;height:20px;border-radius:20px;border:none;top:5px;right:5px}.sidebarList__itemRemove.svelte-5tmqxj.svelte-5tmqxj:hover{background-color:black}.sidebarList__itemRemove.svelte-5tmqxj svg.svelte-5tmqxj{position:absolute;display:block;width:14px;stroke-width:2px;stroke:#fff;height:14px;top:0;bottom:0;right:0;left:0;margin:auto}.ui__iconProject.svelte-5tmqxj.svelte-5tmqxj{width:18px;margin-right:15px;float:left;line-height:0;margin-top:-1px;stroke:#fff;transition:all 0.3s ease-in-out;fill:transparent}.ui__iconGlobal.svelte-5tmqxj.svelte-5tmqxj{width:25px;margin-right:15px;float:left;line-height:0;margin-top:-5px;transition:all 0.3s ease-in-out;fill:#fff}.addProject.svelte-5tmqxj.svelte-5tmqxj{margin-top:15px;width:100%;border:none;cursor:pointer;background-color:rgba(0, 0, 0, 0.3);color:#fff;padding:10px;border-radius:5px;display:block}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhci5zdmVsdGUiLCJzb3VyY2VzIjpbInNpZGViYXIuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IG9uTW91bnQgfSBmcm9tIFwic3ZlbHRlXCI7XG4gIGltcG9ydCBTaW1wbGVCYXIgZnJvbSBcIi4uL2NvbXBvbmVudHMvU2ltcGxlQmFyLnN2ZWx0ZVwiO1xuICBpbXBvcnQgeyBwcm9qZWN0cywgbWVudUFjdGl2ZSB9IGZyb20gXCIuLi9zdG9yZVwiO1xuICBpbXBvcnQgeyBnbG9iYWxQYWNrYWdlcywgb3BlbkRpcmVjdG9yeSB9IGZyb20gXCIuLi91dGlscy9zaGVsbC5qc1wiO1xuICBpbXBvcnQgeyBpc0pzb24gfSBmcm9tIFwiLi4vdXRpbHMvaW5kZXguanNcIjtcblxuICBsZXQgcGFja2FnZXMgPSB7fTtcbiAgb25Nb3VudChhc3luYyAoKSA9PiB7XG4gICAgcGFja2FnZXMgPSBpc0pzb24gPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicGFja2FnZXNcIikpIDoge307XG4gICAgcHJvamVjdHMuc2V0KGlzSnNvbiA/IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJwcm9qZWN0c1wiKSkgOiBbXSk7XG4gICAgcGFja2FnZXMgPSBhd2FpdCBnbG9iYWxQYWNrYWdlcygpLnRoZW4oKHJlcykgPT4gcmVzKTtcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInBhY2thZ2VzXCIsIEpTT04uc3RyaW5naWZ5KHBhY2thZ2VzKSk7XG4gIH0pO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZSBsYW5nPVwic2Nzc1wiPi5zaWRlYmFyIHtcbiAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjEpO1xuICB3aWR0aDogMjUwcHg7XG4gIGhlaWdodDogMTAwdmg7XG4gIGNvbG9yOiAjZmZmO1xuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICBwYWRkaW5nOiA0MHB4IDE1cHggMTVweDtcbiAgLXdlYmtpdC1hcHAtcmVnaW9uOiBkcmFnO1xuICAtd2Via2l0LXVzZXItc2VsZWN0OiBub25lO1xuICBwb3NpdGlvbjogc3RpY2t5O1xuICB0b3A6IDA7IH1cblxuLnNpZGViYXJMaXN0X190aXRsZSB7XG4gIGZvbnQtc2l6ZTogMTFweDtcbiAgZm9udC13ZWlnaHQ6IDUwMDtcbiAgbGV0dGVyLXNwYWNpbmc6IDAuNXB4O1xuICBjb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpO1xuICBkaXNwbGF5OiBibG9jazsgfVxuXG4uc2lkZWJhckxpc3RfX2l0ZW0ge1xuICB0ZXh0LWFsaWduOiBsZWZ0O1xuICB3aWR0aDogMTAwJTtcbiAgYm9yZGVyOiBub25lO1xuICBjb2xvcjogI2ZmZjtcbiAgcGFkZGluZzogN3B4IDE1cHg7XG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xuICBib3JkZXItcmFkaXVzOiA3cHg7XG4gIGZvbnQtc2l6ZTogMTRweDtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBibG9jaztcbiAgaGVpZ2h0OiAzMHB4O1xuICBsaW5lLWhlaWdodDogbm9ybWFsO1xuICB0cmFuc2l0aW9uOiBhbGwgMC4zcyBlYXNlLWluLW91dDtcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7IH1cbiAgLnNpZGViYXJMaXN0X19pdGVtIHNwYW4ge1xuICAgIGZsb2F0OiByaWdodDtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSk7XG4gICAgY29sb3I6ICNmZmY7XG4gICAgcGFkZGluZzogMXB4IDVweCAwO1xuICAgIGJvcmRlci1yYWRpdXM6IDUwcHg7XG4gICAgZm9udC1zaXplOiAxMnB4O1xuICAgIHRyYW5zaXRpb246IGFsbCAwLjNzIGVhc2UtaW4tb3V0OyB9XG4gIC5zaWRlYmFyTGlzdF9faXRlbTpob3ZlciAudWlfX2ljb25HbG9iYWwge1xuICAgIGZpbGw6IHJlZDsgfVxuICAuc2lkZWJhckxpc3RfX2l0ZW06aG92ZXIgLnVpX19pY29uUHJvamVjdCB7XG4gICAgZmlsbDogI2ZmZjsgfVxuICAuc2lkZWJhckxpc3RfX2l0ZW0uYWN0aXZlIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSk7XG4gICAgcGFkZGluZy1yaWdodDogMzBweDsgfVxuICAgIC5zaWRlYmFyTGlzdF9faXRlbS5hY3RpdmUgc3BhbiB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMik7IH1cbiAgICAuc2lkZWJhckxpc3RfX2l0ZW0uYWN0aXZlIC5zaWRlYmFyTGlzdF9faXRlbVJlbW92ZSB7XG4gICAgICBvcGFjaXR5OiAxOyB9XG4gICAgLnNpZGViYXJMaXN0X19pdGVtLmFjdGl2ZSAudWlfX2ljb25HbG9iYWwge1xuICAgICAgZmlsbDogcmVkOyB9XG4gICAgLnNpZGViYXJMaXN0X19pdGVtLmFjdGl2ZSAudWlfX2ljb25Qcm9qZWN0IHtcbiAgICAgIGZpbGw6ICNmZmY7IH1cblxuLnNpZGViYXJMaXN0X19pdGVtUmVtb3ZlIHtcbiAgb3BhY2l0eTogMDtcbiAgdHJhbnNpdGlvbjogYWxsIDAuM3MgZWFzZS1pbi1vdXQ7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpO1xuICB3aWR0aDogMjBweDtcbiAgaGVpZ2h0OiAyMHB4O1xuICBib3JkZXItcmFkaXVzOiAyMHB4O1xuICBib3JkZXI6IG5vbmU7XG4gIHRvcDogNXB4O1xuICByaWdodDogNXB4OyB9XG4gIC5zaWRlYmFyTGlzdF9faXRlbVJlbW92ZTpob3ZlciB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7IH1cbiAgLnNpZGViYXJMaXN0X19pdGVtUmVtb3ZlIHN2ZyB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIHdpZHRoOiAxNHB4O1xuICAgIHN0cm9rZS13aWR0aDogMnB4O1xuICAgIHN0cm9rZTogI2ZmZjtcbiAgICBoZWlnaHQ6IDE0cHg7XG4gICAgdG9wOiAwO1xuICAgIGJvdHRvbTogMDtcbiAgICByaWdodDogMDtcbiAgICBsZWZ0OiAwO1xuICAgIG1hcmdpbjogYXV0bzsgfVxuXG4udWlfX2ljb25Qcm9qZWN0IHtcbiAgd2lkdGg6IDE4cHg7XG4gIG1hcmdpbi1yaWdodDogMTVweDtcbiAgZmxvYXQ6IGxlZnQ7XG4gIGxpbmUtaGVpZ2h0OiAwO1xuICBtYXJnaW4tdG9wOiAtMXB4O1xuICBzdHJva2U6ICNmZmY7XG4gIHRyYW5zaXRpb246IGFsbCAwLjNzIGVhc2UtaW4tb3V0O1xuICBmaWxsOiB0cmFuc3BhcmVudDsgfVxuXG4udWlfX2ljb25HbG9iYWwge1xuICB3aWR0aDogMjVweDtcbiAgbWFyZ2luLXJpZ2h0OiAxNXB4O1xuICBmbG9hdDogbGVmdDtcbiAgbGluZS1oZWlnaHQ6IDA7XG4gIG1hcmdpbi10b3A6IC01cHg7XG4gIHRyYW5zaXRpb246IGFsbCAwLjNzIGVhc2UtaW4tb3V0O1xuICBmaWxsOiAjZmZmOyB9XG5cbi5hZGRQcm9qZWN0IHtcbiAgbWFyZ2luLXRvcDogMTVweDtcbiAgd2lkdGg6IDEwMCU7XG4gIGJvcmRlcjogbm9uZTtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMyk7XG4gIGNvbG9yOiAjZmZmO1xuICBwYWRkaW5nOiAxMHB4O1xuICBib3JkZXItcmFkaXVzOiA1cHg7XG4gIGRpc3BsYXk6IGJsb2NrOyB9XG48L3N0eWxlPlxuXG48YXNpZGUgY2xhc3M9XCJzaWRlYmFyXCI+XG4gIDxTaW1wbGVCYXIgbWF4SGVpZ2h0PXsnY2FsYygxMDB2aCAtIDEwNXB4KSd9PlxuICAgIDxzZWN0aW9uIGNsYXNzPVwic2lkZWJhckxpc3RcIj5cbiAgICAgIDxoMSBjbGFzcz1cInNpZGViYXJMaXN0X190aXRsZVwiPkdsb2JhbHM8L2gxPlxuICAgICAgeyNpZiBwYWNrYWdlcy5ucG19XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBjbGFzczphY3RpdmU9eyRtZW51QWN0aXZlID09PSBgZ2xvYmFsXzFgfVxuICAgICAgICAgIGNsYXNzPVwic2lkZWJhckxpc3RfX2l0ZW1cIlxuICAgICAgICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICBtZW51QWN0aXZlLnNldChgZ2xvYmFsXzFgKTtcbiAgICAgICAgICB9fT5cbiAgICAgICAgICA8c3ZnXG4gICAgICAgICAgICBjbGFzcz1cInVpX19pY29uR2xvYmFsXCJcbiAgICAgICAgICAgIHZpZXdCb3g9XCIwIDAgMzIgMzJcIlxuICAgICAgICAgICAgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICAgICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgICAgZD1cIk0gMCAxMCBMIDAgMjEgTCA5IDIxIEwgOSAyMyBMIDE2IDIzIEwgMTYgMjEgTCAzMiAyMSBMIDMyIDEwIEwgMFxuICAgICAgICAgICAgICAxMCB6IE0gMS43NzczNDM4IDExLjc3NzM0NCBMIDguODg4NjcxOSAxMS43NzczNDQgTCA4Ljg5MDYyNVxuICAgICAgICAgICAgICAxMS43NzczNDQgTCA4Ljg5MDYyNSAxOS40NDUzMTIgTCA3LjExMTMyODEgMTkuNDQ1MzEyIEwgNy4xMTEzMjgxXG4gICAgICAgICAgICAgIDEzLjU1NjY0MSBMIDUuMzMzOTg0NCAxMy41NTY2NDEgTCA1LjMzMzk4NDQgMTkuNDQ1MzEyIEwgMS43NzczNDM4XG4gICAgICAgICAgICAgIDE5LjQ0NTMxMiBMIDEuNzc3MzQzOCAxMS43NzczNDQgeiBNIDEwLjY2Nzk2OSAxMS43NzczNDQgTFxuICAgICAgICAgICAgICAxNy43NzczNDQgMTEuNzc3MzQ0IEwgMTcuNzc5Mjk3IDExLjc3NzM0NCBMIDE3Ljc3OTI5NyAxOS40NDMzNTkgTFxuICAgICAgICAgICAgICAxNC4yMjI2NTYgMTkuNDQzMzU5IEwgMTQuMjIyNjU2IDIxLjIyMjY1NiBMIDEwLjY2Nzk2OSAyMS4yMjI2NTYgTFxuICAgICAgICAgICAgICAxMC42Njc5NjkgMTEuNzc3MzQ0IHogTSAxOS41NTY2NDEgMTEuNzc3MzQ0IEwgMzAuMjIyNjU2IDExLjc3NzM0NFxuICAgICAgICAgICAgICBMIDMwLjIyNDYwOSAxMS43NzczNDQgTCAzMC4yMjQ2MDkgMTkuNDQ1MzEyIEwgMjguNDQ1MzEyIDE5LjQ0NTMxMlxuICAgICAgICAgICAgICBMIDI4LjQ0NTMxMiAxMy41NTY2NDEgTCAyNi42Njc5NjkgMTMuNTU2NjQxIEwgMjYuNjY3OTY5IDE5LjQ0NTMxMlxuICAgICAgICAgICAgICBMIDI0Ljg5MDYyNSAxOS40NDUzMTIgTCAyNC44OTA2MjUgMTMuNTU2NjQxIEwgMjMuMTExMzI4IDEzLjU1NjY0MVxuICAgICAgICAgICAgICBMIDIzLjExMTMyOCAxOS40NDUzMTIgTCAxOS41NTY2NDEgMTkuNDQ1MzEyIEwgMTkuNTU2NjQxIDExLjc3NzM0NFxuICAgICAgICAgICAgICB6IE0gMTQuMjIyNjU2IDEzLjU1NjY0MSBMIDE0LjIyMjY1NiAxNy42Njc5NjkgTCAxNiAxNy42Njc5NjkgTCAxNlxuICAgICAgICAgICAgICAxMy41NTY2NDEgTCAxNC4yMjI2NTYgMTMuNTU2NjQxIHpcIiAvPlxuICAgICAgICAgIDwvc3ZnPlxuICAgICAgICAgIE5wbVxuICAgICAgICAgIDxzcGFuPntwYWNrYWdlcy5ucG19PC9zcGFuPlxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIHsvaWZ9XG4gICAgICB7I2lmIHBhY2thZ2VzLnlhcm59XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBjbGFzczphY3RpdmU9eyRtZW51QWN0aXZlID09PSBgZ2xvYmFsXzJgfVxuICAgICAgICAgIGNsYXNzPVwic2lkZWJhckxpc3RfX2l0ZW1cIlxuICAgICAgICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICBtZW51QWN0aXZlLnNldChgZ2xvYmFsXzJgKTtcbiAgICAgICAgICB9fT5cbiAgICAgICAgICA8c3ZnXG4gICAgICAgICAgICBjbGFzcz1cInVpX19pY29uR2xvYmFsXCJcbiAgICAgICAgICAgIHZpZXdCb3g9XCIwIDAgMzIgMzJcIlxuICAgICAgICAgICAgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICAgICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgICAgZD1cIk0gMTYgMyBDIDguOCAzIDMgOC44IDMgMTYgQyAzIDIzLjIgOC44IDI5IDE2IDI5IEMgMjMuMiAyOSAyOVxuICAgICAgICAgICAgICAyMy4yIDI5IDE2IEMgMjkgOC44IDIzLjIgMyAxNiAzIHogTSAxNiA1IEMgMjIuMSA1IDI3IDkuOSAyNyAxNiBDXG4gICAgICAgICAgICAgIDI3IDIyLjEgMjIuMSAyNyAxNiAyNyBDIDkuOSAyNyA1IDIyLjEgNSAxNiBDIDUgOS45IDkuOSA1IDE2IDUgeiBNXG4gICAgICAgICAgICAgIDE2LjIwODk4NCA5LjA0NDkyMTkgQyAxNS43NTkxOCA5LjEyMTQ4NDQgMTUuMzAwNzgxIDEwLjUgMTUuMzAwNzgxXG4gICAgICAgICAgICAgIDEwLjUgQyAxNS4zMDA3ODEgMTAuNSAxNC4wOTk2MDkgMTAuMzAwNzgxIDEzLjA5OTYwOSAxMS4zMDA3ODEgQ1xuICAgICAgICAgICAgICAxMi44OTk2MDkgMTEuNTAwNzgxIDEyLjcwMDM5MSAxMS41OTkyMTkgMTIuNDAwMzkxIDExLjY5OTIxOSBDXG4gICAgICAgICAgICAgIDEyLjMwMDM5MSAxMS43OTkyMTkgMTIuMiAxMS44MDAzOTEgMTIgMTIuNDAwMzkxIEMgMTEuNiAxMy4zMDAzOTFcbiAgICAgICAgICAgICAgMTIuNTk5NjA5IDE0LjQwMDM5MSAxMi41OTk2MDkgMTQuNDAwMzkxIEMgMTAuNDk5NjA5IDE1LjkwMDM5MVxuICAgICAgICAgICAgICAxMC41OTkyMTkgMTcuOTAwMzkxIDEwLjY5OTIxOSAxOC40MDAzOTEgQyA5LjM5OTIxODcgMTkuNTAwMzkxXG4gICAgICAgICAgICAgIDkuODk5MjE4NyAyMC45MDA3ODEgMTAuMTk5MjE5IDIxLjMwMDc4MSBDIDEwLjM5OTIxOSAyMS42MDA3ODFcbiAgICAgICAgICAgICAgMTAuNTk5MjE5IDIxLjUgMTAuNjk5MjE5IDIxLjUgQyAxMC42OTkyMTkgMjEuNiAxMC4xOTkyMTkgMjIuMjAwMzkxXG4gICAgICAgICAgICAgIDEwLjY5OTIxOSAyMi40MDAzOTEgQyAxMS4xOTkyMTkgMjIuNzAwMzkxIDEyLjAwMDM5MSAyMi44MDAzOTFcbiAgICAgICAgICAgICAgMTIuNDAwMzkxIDIyLjQwMDM5MSBDIDEyLjcwMDM5MSAyMi4xMDAzOTEgMTIuODAwMzkxIDIxLjQ5OTIxOVxuICAgICAgICAgICAgICAxMi45MDAzOTEgMjEuMTk5MjE5IEMgMTMuMDAwMzkxIDIxLjA5OTIxOSAxMy4wMDAzOTEgMjEuMzk5NjA5XG4gICAgICAgICAgICAgIDEzLjQwMDM5MSAyMS41OTk2MDkgQyAxMy40MDAzOTEgMjEuNTk5NjA5IDEyLjcgMjEuODk5NjA5IDEzXG4gICAgICAgICAgICAgIDIyLjU5OTYwOSBDIDEzLjEgMjIuNzk5NjA5IDEzLjQgMjMgMTQgMjMgQyAxNC4yIDIzIDE2LjU5OTIxOVxuICAgICAgICAgICAgICAyMi44OTkyMTkgMTcuMTk5MjE5IDIyLjY5OTIxOSBDIDE3LjU5OTIxOSAyMi41OTkyMTkgMTcuNjk5MjE5XG4gICAgICAgICAgICAgIDIyLjQwMDM5MSAxNy42OTkyMTkgMjIuNDAwMzkxIEMgMjAuMjk5MjE5IDIxLjcwMDM5MSAyMC43OTk2MDlcbiAgICAgICAgICAgICAgMjAuNTk5MjE5IDIyLjU5OTYwOSAyMC4xOTkyMTkgQyAyMy4xOTk2MDkgMjAuMDk5MjE5IDIzLjE5OTYwOVxuICAgICAgICAgICAgICAxOS4wOTkyMTkgMjIuMDk5NjA5IDE5LjE5OTIxOSBDIDIxLjI5OTYwOSAxOS4xOTkyMTkgMjAuNiAxOS42IDIwXG4gICAgICAgICAgICAgIDIwIEMgMTkgMjAuNiAxOC4zMDA3ODEgMjAuNjk5NjA5IDE4LjMwMDc4MSAyMC41OTk2MDkgQyAxOC4yMDA3ODFcbiAgICAgICAgICAgICAgMjAuNDk5NjA5IDE4LjY5OTIxOSAxOS4zIDE4LjE5OTIxOSAxOCBDIDE3LjY5OTIxOSAxNi42IDE2LjgwMDM5MVxuICAgICAgICAgICAgICAxNi4xOTk2MDkgMTYuOTAwMzkxIDE2LjA5OTYwOSBDIDE3LjIwMDM5MSAxNS41OTk2MDkgMTcuODk5MjE5XG4gICAgICAgICAgICAgIDE0LjgwMDM5MSAxOC4xOTkyMTkgMTMuNDAwMzkxIEMgMTguMjk5MjE5IDEyLjUwMDM5MSAxOC4zMDAzOTFcbiAgICAgICAgICAgICAgMTEuMDAwNzgxIDE3LjkwMDM5MSAxMC4zMDA3ODEgQyAxNy44MDAzOTEgMTAuMTAwNzgxIDE3LjE5OTIxOSAxMC41XG4gICAgICAgICAgICAgIDE3LjE5OTIxOSAxMC41IEMgMTcuMTk5MjE5IDEwLjUgMTYuNjAwMzkxIDkuMTk5NjA5NCAxNi40MDAzOTFcbiAgICAgICAgICAgICAgOS4wOTk2MDk0IEMgMTYuMzM3ODkxIDkuMDQ5NjA5NCAxNi4yNzMyNDIgOS4wMzM5ODQ0IDE2LjIwODk4NFxuICAgICAgICAgICAgICA5LjA0NDkyMTkgelwiIC8+XG4gICAgICAgICAgPC9zdmc+XG4gICAgICAgICAgWWFyblxuICAgICAgICAgIDxzcGFuPntwYWNrYWdlcy55YXJufTwvc3Bhbj5cbiAgICAgICAgPC9idXR0b24+XG4gICAgICB7L2lmfVxuICAgICAgeyNpZiBwYWNrYWdlcy5wbnBtfVxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgY2xhc3M6YWN0aXZlPXskbWVudUFjdGl2ZSA9PT0gYGdsb2JhbF8zYH1cbiAgICAgICAgICBjbGFzcz1cInNpZGViYXJMaXN0X19pdGVtXCJcbiAgICAgICAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgbWVudUFjdGl2ZS5zZXQoYGdsb2JhbF8zYCk7XG4gICAgICAgICAgfX0+XG4gICAgICAgICAgPHN2Z1xuICAgICAgICAgICAgY2xhc3M9XCJ1aV9faWNvbkdsb2JhbFwiXG4gICAgICAgICAgICB2aWV3Qm94PVwiMCAwIDMyIDMyXCJcbiAgICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICAgIGQ9XCJNIDE2IDMgQyA4LjggMyAzIDguOCAzIDE2IEMgMyAyMy4yIDguOCAyOSAxNiAyOSBDIDIzLjIgMjkgMjlcbiAgICAgICAgICAgICAgMjMuMiAyOSAxNiBDIDI5IDguOCAyMy4yIDMgMTYgMyB6IE0gMTYgNSBDIDIyLjEgNSAyNyA5LjkgMjcgMTYgQ1xuICAgICAgICAgICAgICAyNyAyMi4xIDIyLjEgMjcgMTYgMjcgQyA5LjkgMjcgNSAyMi4xIDUgMTYgQyA1IDkuOSA5LjkgNSAxNiA1IHogTVxuICAgICAgICAgICAgICAxNi4yMDg5ODQgOS4wNDQ5MjE5IEMgMTUuNzU5MTggOS4xMjE0ODQ0IDE1LjMwMDc4MSAxMC41IDE1LjMwMDc4MVxuICAgICAgICAgICAgICAxMC41IEMgMTUuMzAwNzgxIDEwLjUgMTQuMDk5NjA5IDEwLjMwMDc4MSAxMy4wOTk2MDkgMTEuMzAwNzgxIENcbiAgICAgICAgICAgICAgMTIuODk5NjA5IDExLjUwMDc4MSAxMi43MDAzOTEgMTEuNTk5MjE5IDEyLjQwMDM5MSAxMS42OTkyMTkgQ1xuICAgICAgICAgICAgICAxMi4zMDAzOTEgMTEuNzk5MjE5IDEyLjIgMTEuODAwMzkxIDEyIDEyLjQwMDM5MSBDIDExLjYgMTMuMzAwMzkxXG4gICAgICAgICAgICAgIDEyLjU5OTYwOSAxNC40MDAzOTEgMTIuNTk5NjA5IDE0LjQwMDM5MSBDIDEwLjQ5OTYwOSAxNS45MDAzOTFcbiAgICAgICAgICAgICAgMTAuNTk5MjE5IDE3LjkwMDM5MSAxMC42OTkyMTkgMTguNDAwMzkxIEMgOS4zOTkyMTg3IDE5LjUwMDM5MVxuICAgICAgICAgICAgICA5Ljg5OTIxODcgMjAuOTAwNzgxIDEwLjE5OTIxOSAyMS4zMDA3ODEgQyAxMC4zOTkyMTkgMjEuNjAwNzgxXG4gICAgICAgICAgICAgIDEwLjU5OTIxOSAyMS41IDEwLjY5OTIxOSAyMS41IEMgMTAuNjk5MjE5IDIxLjYgMTAuMTk5MjE5IDIyLjIwMDM5MVxuICAgICAgICAgICAgICAxMC42OTkyMTkgMjIuNDAwMzkxIEMgMTEuMTk5MjE5IDIyLjcwMDM5MSAxMi4wMDAzOTEgMjIuODAwMzkxXG4gICAgICAgICAgICAgIDEyLjQwMDM5MSAyMi40MDAzOTEgQyAxMi43MDAzOTEgMjIuMTAwMzkxIDEyLjgwMDM5MSAyMS40OTkyMTlcbiAgICAgICAgICAgICAgMTIuOTAwMzkxIDIxLjE5OTIxOSBDIDEzLjAwMDM5MSAyMS4wOTkyMTkgMTMuMDAwMzkxIDIxLjM5OTYwOVxuICAgICAgICAgICAgICAxMy40MDAzOTEgMjEuNTk5NjA5IEMgMTMuNDAwMzkxIDIxLjU5OTYwOSAxMi43IDIxLjg5OTYwOSAxM1xuICAgICAgICAgICAgICAyMi41OTk2MDkgQyAxMy4xIDIyLjc5OTYwOSAxMy40IDIzIDE0IDIzIEMgMTQuMiAyMyAxNi41OTkyMTlcbiAgICAgICAgICAgICAgMjIuODk5MjE5IDE3LjE5OTIxOSAyMi42OTkyMTkgQyAxNy41OTkyMTkgMjIuNTk5MjE5IDE3LjY5OTIxOVxuICAgICAgICAgICAgICAyMi40MDAzOTEgMTcuNjk5MjE5IDIyLjQwMDM5MSBDIDIwLjI5OTIxOSAyMS43MDAzOTEgMjAuNzk5NjA5XG4gICAgICAgICAgICAgIDIwLjU5OTIxOSAyMi41OTk2MDkgMjAuMTk5MjE5IEMgMjMuMTk5NjA5IDIwLjA5OTIxOSAyMy4xOTk2MDlcbiAgICAgICAgICAgICAgMTkuMDk5MjE5IDIyLjA5OTYwOSAxOS4xOTkyMTkgQyAyMS4yOTk2MDkgMTkuMTk5MjE5IDIwLjYgMTkuNiAyMFxuICAgICAgICAgICAgICAyMCBDIDE5IDIwLjYgMTguMzAwNzgxIDIwLjY5OTYwOSAxOC4zMDA3ODEgMjAuNTk5NjA5IEMgMTguMjAwNzgxXG4gICAgICAgICAgICAgIDIwLjQ5OTYwOSAxOC42OTkyMTkgMTkuMyAxOC4xOTkyMTkgMTggQyAxNy42OTkyMTkgMTYuNiAxNi44MDAzOTFcbiAgICAgICAgICAgICAgMTYuMTk5NjA5IDE2LjkwMDM5MSAxNi4wOTk2MDkgQyAxNy4yMDAzOTEgMTUuNTk5NjA5IDE3Ljg5OTIxOVxuICAgICAgICAgICAgICAxNC44MDAzOTEgMTguMTk5MjE5IDEzLjQwMDM5MSBDIDE4LjI5OTIxOSAxMi41MDAzOTEgMTguMzAwMzkxXG4gICAgICAgICAgICAgIDExLjAwMDc4MSAxNy45MDAzOTEgMTAuMzAwNzgxIEMgMTcuODAwMzkxIDEwLjEwMDc4MSAxNy4xOTkyMTkgMTAuNVxuICAgICAgICAgICAgICAxNy4xOTkyMTkgMTAuNSBDIDE3LjE5OTIxOSAxMC41IDE2LjYwMDM5MSA5LjE5OTYwOTQgMTYuNDAwMzkxXG4gICAgICAgICAgICAgIDkuMDk5NjA5NCBDIDE2LjMzNzg5MSA5LjA0OTYwOTQgMTYuMjczMjQyIDkuMDMzOTg0NCAxNi4yMDg5ODRcbiAgICAgICAgICAgICAgOS4wNDQ5MjE5IHpcIiAvPlxuICAgICAgICAgIDwvc3ZnPlxuICAgICAgICAgIFBucG1cbiAgICAgICAgICA8c3Bhbj57cGFja2FnZXMucG5wbX08L3NwYW4+XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgey9pZn1cbiAgICA8L3NlY3Rpb24+XG4gICAgPHNlY3Rpb24gY2xhc3M9XCJzaWRlYmFyTGlzdFwiPlxuICAgICAgPGgxIGNsYXNzPVwic2lkZWJhckxpc3RfX3RpdGxlXCI+UHJvamVjdHM8L2gxPlxuICAgICAgeyNpZiAkcHJvamVjdHN9XG4gICAgICAgIHsjZWFjaCAkcHJvamVjdHMgYXMgeyBpZCwgbmFtZSwgcGF0aCB9fVxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIGNsYXNzOmFjdGl2ZT17JG1lbnVBY3RpdmUgPT09IGBwcm9qZWN0XyR7aWR9YH1cbiAgICAgICAgICAgIGNsYXNzPVwic2lkZWJhckxpc3RfX2l0ZW1cIlxuICAgICAgICAgICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgbWVudUFjdGl2ZS5zZXQoYHByb2plY3RfJHtpZH1gKTtcbiAgICAgICAgICAgIH19PlxuICAgICAgICAgICAgPHN2Z1xuICAgICAgICAgICAgICBjbGFzcz1cInVpX19pY29uUHJvamVjdFwiXG4gICAgICAgICAgICAgIHZpZXdCb3g9XCIwIDAgMjQgMjRcIlxuICAgICAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICAgICAgZD1cIk0yMiAxOWEyIDIgMCAwIDEtMiAySDRhMiAyIDAgMCAxLTItMlY1YTIgMiAwIDAgMSAyLTJoNWwyXG4gICAgICAgICAgICAgICAgM2g5YTIgMiAwIDAgMSAyIDJ6XCIgLz5cbiAgICAgICAgICAgIDwvc3ZnPlxuICAgICAgICAgICAge25hbWV9XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIGNsYXNzPVwic2lkZWJhckxpc3RfX2l0ZW1SZW1vdmVcIlxuICAgICAgICAgICAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2plY3RGaWx0ZXIgPSAkcHJvamVjdHMuZmlsdGVyKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5pZCAhPT0gaWQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcHJvamVjdHMuc2V0KHByb2plY3RGaWx0ZXIpO1xuICAgICAgICAgICAgICAgIG1lbnVBY3RpdmUuc2V0KG51bGwpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwcm9qZWN0cycsIEpTT04uc3RyaW5naWZ5KHByb2plY3RGaWx0ZXIpKTtcbiAgICAgICAgICAgICAgfX0+XG4gICAgICAgICAgICAgIDxzdmcgdmlld0JveD1cIjAgMCAyNCAyNFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICAgICAgICA8bGluZSB4MT1cIjE4XCIgeDI9XCI2XCIgeTE9XCI2XCIgeTI9XCIxOFwiIC8+XG4gICAgICAgICAgICAgICAgPGxpbmUgeDE9XCI2XCIgeDI9XCIxOFwiIHkxPVwiNlwiIHkyPVwiMThcIiAvPlxuICAgICAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICB7L2VhY2h9XG4gICAgICB7L2lmfVxuICAgIDwvc2VjdGlvbj5cbiAgPC9TaW1wbGVCYXI+XG4gIDxidXR0b25cbiAgICBjbGFzcz1cImFkZFByb2plY3RcIlxuICAgIG9uOmNsaWNrPXsoKSA9PiB7XG4gICAgICBvcGVuRGlyZWN0b3J5KClcbiAgICAgICAgLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGlmICghcmVzdWx0LmNhbmNlbGVkKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IHJlc3VsdC5maWxlUGF0aHNbMF07XG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aEFycmF5ID0gcmVzdWx0LmZpbGVQYXRoc1swXS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgY29uc3QgcHJvamVjdE5hbWUgPSBwcm9qZWN0UGF0aEFycmF5W3Byb2plY3RQYXRoQXJyYXkubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBwcm9qZWN0cy5zZXQoW1xuICAgICAgICAgICAgICAuLi4kcHJvamVjdHMsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogJHByb2plY3RzWyRwcm9qZWN0cy5sZW5ndGggLSAxXVxuICAgICAgICAgICAgICAgICAgPyAkcHJvamVjdHNbJHByb2plY3RzLmxlbmd0aCAtIDFdLmlkICsgMVxuICAgICAgICAgICAgICAgICAgOiAwLFxuICAgICAgICAgICAgICAgIG5hbWU6IHByb2plY3ROYW1lLFxuICAgICAgICAgICAgICAgIHBhdGg6IHByb2plY3RQYXRoLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncHJvamVjdHMnLCBKU09OLnN0cmluZ2lmeSgkcHJvamVjdHMpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfX0+XG4gICAgQWRkIFByb2plY3RcbiAgPC9idXR0b24+XG48L2FzaWRlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWdCbUIsUUFBUSw0QkFBQyxDQUFDLEFBQzNCLFVBQVUsQ0FBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUM5QixLQUFLLENBQUUsS0FBSyxDQUNaLE1BQU0sQ0FBRSxLQUFLLENBQ2IsS0FBSyxDQUFFLElBQUksQ0FDWCxVQUFVLENBQUUsVUFBVSxDQUN0QixPQUFPLENBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQ3ZCLGtCQUFrQixDQUFFLElBQUksQ0FDeEIsbUJBQW1CLENBQUUsSUFBSSxDQUN6QixRQUFRLENBQUUsTUFBTSxDQUNoQixHQUFHLENBQUUsQ0FBQyxBQUFFLENBQUMsQUFFWCxtQkFBbUIsNEJBQUMsQ0FBQyxBQUNuQixTQUFTLENBQUUsSUFBSSxDQUNmLFdBQVcsQ0FBRSxHQUFHLENBQ2hCLGNBQWMsQ0FBRSxLQUFLLENBQ3JCLEtBQUssQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUMvQixPQUFPLENBQUUsS0FBSyxBQUFFLENBQUMsQUFFbkIsa0JBQWtCLDRCQUFDLENBQUMsQUFDbEIsVUFBVSxDQUFFLElBQUksQ0FDaEIsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLEtBQUssQ0FBRSxJQUFJLENBQ1gsT0FBTyxDQUFFLEdBQUcsQ0FBQyxJQUFJLENBQ2pCLGdCQUFnQixDQUFFLFdBQVcsQ0FDN0IsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsU0FBUyxDQUFFLElBQUksQ0FDZixRQUFRLENBQUUsUUFBUSxDQUNsQixPQUFPLENBQUUsS0FBSyxDQUNkLE1BQU0sQ0FBRSxJQUFJLENBQ1osV0FBVyxDQUFFLE1BQU0sQ0FDbkIsVUFBVSxDQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUNoQyxXQUFXLENBQUUsTUFBTSxDQUNuQixRQUFRLENBQUUsTUFBTSxDQUNoQixhQUFhLENBQUUsUUFBUSxBQUFFLENBQUMsQUFDMUIsZ0NBQWtCLENBQUMsSUFBSSxjQUFDLENBQUMsQUFDdkIsS0FBSyxDQUFFLEtBQUssQ0FDWixnQkFBZ0IsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUMxQyxLQUFLLENBQUUsSUFBSSxDQUNYLE9BQU8sQ0FBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FDbEIsYUFBYSxDQUFFLElBQUksQ0FDbkIsU0FBUyxDQUFFLElBQUksQ0FDZixVQUFVLENBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEFBQUUsQ0FBQyxBQUNyQyxnQ0FBa0IsTUFBTSxDQUFDLGVBQWUsY0FBQyxDQUFDLEFBQ3hDLElBQUksQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUNkLGdDQUFrQixNQUFNLENBQUMsZ0JBQWdCLGNBQUMsQ0FBQyxBQUN6QyxJQUFJLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDZixrQkFBa0IsT0FBTyw0QkFBQyxDQUFDLEFBQ3pCLGdCQUFnQixDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzFDLGFBQWEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUN0QixrQkFBa0IscUJBQU8sQ0FBQyxJQUFJLGNBQUMsQ0FBQyxBQUM5QixnQkFBZ0IsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUFFLENBQUMsQUFDL0Msa0JBQWtCLHFCQUFPLENBQUMsd0JBQXdCLGNBQUMsQ0FBQyxBQUNsRCxPQUFPLENBQUUsQ0FBQyxBQUFFLENBQUMsQUFDZixrQkFBa0IscUJBQU8sQ0FBQyxlQUFlLGNBQUMsQ0FBQyxBQUN6QyxJQUFJLENBQUUsR0FBRyxBQUFFLENBQUMsQUFDZCxrQkFBa0IscUJBQU8sQ0FBQyxnQkFBZ0IsY0FBQyxDQUFDLEFBQzFDLElBQUksQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUVuQix3QkFBd0IsNEJBQUMsQ0FBQyxBQUN4QixPQUFPLENBQUUsQ0FBQyxDQUNWLFVBQVUsQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDaEMsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsZ0JBQWdCLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDMUMsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLGFBQWEsQ0FBRSxJQUFJLENBQ25CLE1BQU0sQ0FBRSxJQUFJLENBQ1osR0FBRyxDQUFFLEdBQUcsQ0FDUixLQUFLLENBQUUsR0FBRyxBQUFFLENBQUMsQUFDYixvREFBd0IsTUFBTSxBQUFDLENBQUMsQUFDOUIsZ0JBQWdCLENBQUUsS0FBSyxBQUFFLENBQUMsQUFDNUIsc0NBQXdCLENBQUMsR0FBRyxjQUFDLENBQUMsQUFDNUIsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsT0FBTyxDQUFFLEtBQUssQ0FDZCxLQUFLLENBQUUsSUFBSSxDQUNYLFlBQVksQ0FBRSxHQUFHLENBQ2pCLE1BQU0sQ0FBRSxJQUFJLENBQ1osTUFBTSxDQUFFLElBQUksQ0FDWixHQUFHLENBQUUsQ0FBQyxDQUNOLE1BQU0sQ0FBRSxDQUFDLENBQ1QsS0FBSyxDQUFFLENBQUMsQ0FDUixJQUFJLENBQUUsQ0FBQyxDQUNQLE1BQU0sQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUVuQixnQkFBZ0IsNEJBQUMsQ0FBQyxBQUNoQixLQUFLLENBQUUsSUFBSSxDQUNYLFlBQVksQ0FBRSxJQUFJLENBQ2xCLEtBQUssQ0FBRSxJQUFJLENBQ1gsV0FBVyxDQUFFLENBQUMsQ0FDZCxVQUFVLENBQUUsSUFBSSxDQUNoQixNQUFNLENBQUUsSUFBSSxDQUNaLFVBQVUsQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDaEMsSUFBSSxDQUFFLFdBQVcsQUFBRSxDQUFDLEFBRXRCLGVBQWUsNEJBQUMsQ0FBQyxBQUNmLEtBQUssQ0FBRSxJQUFJLENBQ1gsWUFBWSxDQUFFLElBQUksQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxXQUFXLENBQUUsQ0FBQyxDQUNkLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLFVBQVUsQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDaEMsSUFBSSxDQUFFLElBQUksQUFBRSxDQUFDLEFBRWYsV0FBVyw0QkFBQyxDQUFDLEFBQ1gsVUFBVSxDQUFFLElBQUksQ0FDaEIsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLE1BQU0sQ0FBRSxPQUFPLENBQ2YsZ0JBQWdCLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDcEMsS0FBSyxDQUFFLElBQUksQ0FDWCxPQUFPLENBQUUsSUFBSSxDQUNiLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLE9BQU8sQ0FBRSxLQUFLLEFBQUUsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i].id;
    	child_ctx[10] = list[i].name;
    	child_ctx[11] = list[i].path;
    	return child_ctx;
    }

    // (138:6) {#if packages.npm}
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
    			t0 = text("\n          Npm\n          ");
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M 0 10 L 0 21 L 9 21 L 9 23 L 16 23 L 16 21 L 32 21 L 32 10 L 0\n              10 z M 1.7773438 11.777344 L 8.8886719 11.777344 L 8.890625\n              11.777344 L 8.890625 19.445312 L 7.1113281 19.445312 L 7.1113281\n              13.556641 L 5.3339844 13.556641 L 5.3339844 19.445312 L 1.7773438\n              19.445312 L 1.7773438 11.777344 z M 10.667969 11.777344 L\n              17.777344 11.777344 L 17.779297 11.777344 L 17.779297 19.443359 L\n              14.222656 19.443359 L 14.222656 21.222656 L 10.667969 21.222656 L\n              10.667969 11.777344 z M 19.556641 11.777344 L 30.222656 11.777344\n              L 30.224609 11.777344 L 30.224609 19.445312 L 28.445312 19.445312\n              L 28.445312 13.556641 L 26.667969 13.556641 L 26.667969 19.445312\n              L 24.890625 19.445312 L 24.890625 13.556641 L 23.111328 13.556641\n              L 23.111328 19.445312 L 19.556641 19.445312 L 19.556641 11.777344\n              z M 14.222656 13.556641 L 14.222656 17.667969 L 16 17.667969 L 16\n              13.556641 L 14.222656 13.556641 z");
    			add_location(path, file$1, 148, 12, 3728);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-5tmqxj");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$1, 144, 10, 3596);
    			attr_dev(span, "class", "svelte-5tmqxj");
    			add_location(span, file$1, 165, 10, 4853);
    			attr_dev(button, "class", "sidebarList__item svelte-5tmqxj");
    			toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_1`);
    			add_location(button, file$1, 138, 8, 3408);
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
    		source: "(138:6) {#if packages.npm}",
    		ctx
    	});

    	return block;
    }

    // (169:6) {#if packages.yarn}
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
    			t0 = text("\n          Yarn\n          ");
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M 16 3 C 8.8 3 3 8.8 3 16 C 3 23.2 8.8 29 16 29 C 23.2 29 29\n              23.2 29 16 C 29 8.8 23.2 3 16 3 z M 16 5 C 22.1 5 27 9.9 27 16 C\n              27 22.1 22.1 27 16 27 C 9.9 27 5 22.1 5 16 C 5 9.9 9.9 5 16 5 z M\n              16.208984 9.0449219 C 15.75918 9.1214844 15.300781 10.5 15.300781\n              10.5 C 15.300781 10.5 14.099609 10.300781 13.099609 11.300781 C\n              12.899609 11.500781 12.700391 11.599219 12.400391 11.699219 C\n              12.300391 11.799219 12.2 11.800391 12 12.400391 C 11.6 13.300391\n              12.599609 14.400391 12.599609 14.400391 C 10.499609 15.900391\n              10.599219 17.900391 10.699219 18.400391 C 9.3992187 19.500391\n              9.8992187 20.900781 10.199219 21.300781 C 10.399219 21.600781\n              10.599219 21.5 10.699219 21.5 C 10.699219 21.6 10.199219 22.200391\n              10.699219 22.400391 C 11.199219 22.700391 12.000391 22.800391\n              12.400391 22.400391 C 12.700391 22.100391 12.800391 21.499219\n              12.900391 21.199219 C 13.000391 21.099219 13.000391 21.399609\n              13.400391 21.599609 C 13.400391 21.599609 12.7 21.899609 13\n              22.599609 C 13.1 22.799609 13.4 23 14 23 C 14.2 23 16.599219\n              22.899219 17.199219 22.699219 C 17.599219 22.599219 17.699219\n              22.400391 17.699219 22.400391 C 20.299219 21.700391 20.799609\n              20.599219 22.599609 20.199219 C 23.199609 20.099219 23.199609\n              19.099219 22.099609 19.199219 C 21.299609 19.199219 20.6 19.6 20\n              20 C 19 20.6 18.300781 20.699609 18.300781 20.599609 C 18.200781\n              20.499609 18.699219 19.3 18.199219 18 C 17.699219 16.6 16.800391\n              16.199609 16.900391 16.099609 C 17.200391 15.599609 17.899219\n              14.800391 18.199219 13.400391 C 18.299219 12.500391 18.300391\n              11.000781 17.900391 10.300781 C 17.800391 10.100781 17.199219 10.5\n              17.199219 10.5 C 17.199219 10.5 16.600391 9.1996094 16.400391\n              9.0996094 C 16.337891 9.0496094 16.273242 9.0339844 16.208984\n              9.0449219 z");
    			add_location(path, file$1, 179, 12, 5265);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-5tmqxj");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$1, 175, 10, 5133);
    			attr_dev(span, "class", "svelte-5tmqxj");
    			add_location(span, file$1, 210, 10, 7429);
    			attr_dev(button, "class", "sidebarList__item svelte-5tmqxj");
    			toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_2`);
    			add_location(button, file$1, 169, 8, 4945);
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
    		source: "(169:6) {#if packages.yarn}",
    		ctx
    	});

    	return block;
    }

    // (214:6) {#if packages.pnpm}
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
    			t0 = text("\n          Pnpm\n          ");
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M 16 3 C 8.8 3 3 8.8 3 16 C 3 23.2 8.8 29 16 29 C 23.2 29 29\n              23.2 29 16 C 29 8.8 23.2 3 16 3 z M 16 5 C 22.1 5 27 9.9 27 16 C\n              27 22.1 22.1 27 16 27 C 9.9 27 5 22.1 5 16 C 5 9.9 9.9 5 16 5 z M\n              16.208984 9.0449219 C 15.75918 9.1214844 15.300781 10.5 15.300781\n              10.5 C 15.300781 10.5 14.099609 10.300781 13.099609 11.300781 C\n              12.899609 11.500781 12.700391 11.599219 12.400391 11.699219 C\n              12.300391 11.799219 12.2 11.800391 12 12.400391 C 11.6 13.300391\n              12.599609 14.400391 12.599609 14.400391 C 10.499609 15.900391\n              10.599219 17.900391 10.699219 18.400391 C 9.3992187 19.500391\n              9.8992187 20.900781 10.199219 21.300781 C 10.399219 21.600781\n              10.599219 21.5 10.699219 21.5 C 10.699219 21.6 10.199219 22.200391\n              10.699219 22.400391 C 11.199219 22.700391 12.000391 22.800391\n              12.400391 22.400391 C 12.700391 22.100391 12.800391 21.499219\n              12.900391 21.199219 C 13.000391 21.099219 13.000391 21.399609\n              13.400391 21.599609 C 13.400391 21.599609 12.7 21.899609 13\n              22.599609 C 13.1 22.799609 13.4 23 14 23 C 14.2 23 16.599219\n              22.899219 17.199219 22.699219 C 17.599219 22.599219 17.699219\n              22.400391 17.699219 22.400391 C 20.299219 21.700391 20.799609\n              20.599219 22.599609 20.199219 C 23.199609 20.099219 23.199609\n              19.099219 22.099609 19.199219 C 21.299609 19.199219 20.6 19.6 20\n              20 C 19 20.6 18.300781 20.699609 18.300781 20.599609 C 18.200781\n              20.499609 18.699219 19.3 18.199219 18 C 17.699219 16.6 16.800391\n              16.199609 16.900391 16.099609 C 17.200391 15.599609 17.899219\n              14.800391 18.199219 13.400391 C 18.299219 12.500391 18.300391\n              11.000781 17.900391 10.300781 C 17.800391 10.100781 17.199219 10.5\n              17.199219 10.5 C 17.199219 10.5 16.600391 9.1996094 16.400391\n              9.0996094 C 16.337891 9.0496094 16.273242 9.0339844 16.208984\n              9.0449219 z");
    			add_location(path, file$1, 224, 12, 7842);
    			attr_dev(svg, "class", "ui__iconGlobal svelte-5tmqxj");
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$1, 220, 10, 7710);
    			attr_dev(span, "class", "svelte-5tmqxj");
    			add_location(span, file$1, 255, 10, 10006);
    			attr_dev(button, "class", "sidebarList__item svelte-5tmqxj");
    			toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_3`);
    			add_location(button, file$1, 214, 8, 7522);
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
    		source: "(214:6) {#if packages.pnpm}",
    		ctx
    	});

    	return block;
    }

    // (262:6) {#if $projects}
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
    		source: "(262:6) {#if $projects}",
    		ctx
    	});

    	return block;
    }

    // (263:8) {#each $projects as { id, name, path }}
    function create_each_block(ctx) {
    	let button1;
    	let svg0;
    	let path;
    	let t0;
    	let t1_value = /*name*/ ctx[10] + "";
    	let t1;
    	let t2;
    	let button0;
    	let svg1;
    	let line0;
    	let line1;
    	let t3;
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
    			svg0 = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			button0 = element("button");
    			svg1 = svg_element("svg");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			t3 = space();
    			attr_dev(path, "d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2\n                3h9a2 2 0 0 1 2 2z");
    			add_location(path, file$1, 273, 14, 10596);
    			attr_dev(svg0, "class", "ui__iconProject svelte-5tmqxj");
    			attr_dev(svg0, "viewBox", "0 0 24 24");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg0, file$1, 269, 12, 10455);
    			attr_dev(line0, "x1", "18");
    			attr_dev(line0, "x2", "6");
    			attr_dev(line0, "y1", "6");
    			attr_dev(line0, "y2", "18");
    			add_location(line0, file$1, 289, 16, 11254);
    			attr_dev(line1, "x1", "6");
    			attr_dev(line1, "x2", "18");
    			attr_dev(line1, "y1", "6");
    			attr_dev(line1, "y2", "18");
    			add_location(line1, file$1, 290, 16, 11309);
    			attr_dev(svg1, "viewBox", "0 0 24 24");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "class", "svelte-5tmqxj");
    			add_location(svg1, file$1, 288, 14, 11177);
    			attr_dev(button0, "class", "sidebarList__itemRemove svelte-5tmqxj");
    			add_location(button0, file$1, 278, 12, 10767);
    			attr_dev(button1, "class", "sidebarList__item svelte-5tmqxj");
    			toggle_class(button1, "active", /*$menuActive*/ ctx[1] === `project_${/*id*/ ctx[9]}`);
    			add_location(button1, file$1, 263, 10, 10245);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button1, anchor);
    			append_dev(button1, svg0);
    			append_dev(svg0, path);
    			append_dev(button1, t0);
    			append_dev(button1, t1);
    			append_dev(button1, t2);
    			append_dev(button1, button0);
    			append_dev(button0, svg1);
    			append_dev(svg1, line0);
    			append_dev(svg1, line1);
    			append_dev(button1, t3);

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
    		source: "(263:8) {#each $projects as { id, name, path }}",
    		ctx
    	});

    	return block;
    }

    // (135:2) <SimpleBar maxHeight={'calc(100vh - 105px)'}>
    function create_default_slot(ctx) {
    	let section0;
    	let h10;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let section1;
    	let h11;
    	let t6;
    	let if_block0 = /*packages*/ ctx[0].npm && create_if_block_3(ctx);
    	let if_block1 = /*packages*/ ctx[0].yarn && create_if_block_2(ctx);
    	let if_block2 = /*packages*/ ctx[0].pnpm && create_if_block_1(ctx);
    	let if_block3 = /*$projects*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
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
    			attr_dev(h10, "class", "sidebarList__title svelte-5tmqxj");
    			add_location(h10, file$1, 136, 6, 3331);
    			attr_dev(section0, "class", "sidebarList");
    			add_location(section0, file$1, 135, 4, 3295);
    			attr_dev(h11, "class", "sidebarList__title svelte-5tmqxj");
    			add_location(h11, file$1, 260, 6, 10120);
    			attr_dev(section1, "class", "sidebarList");
    			add_location(section1, file$1, 259, 4, 10084);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			append_dev(section0, h10);
    			append_dev(section0, t1);
    			if (if_block0) if_block0.m(section0, null);
    			append_dev(section0, t2);
    			if (if_block1) if_block1.m(section0, null);
    			append_dev(section0, t3);
    			if (if_block2) if_block2.m(section0, null);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, h11);
    			append_dev(section1, t6);
    			if (if_block3) if_block3.m(section1, null);
    		},
    		p: function update(ctx, dirty) {
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section0);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(section1);
    			if (if_block3) if_block3.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(135:2) <SimpleBar maxHeight={'calc(100vh - 105px)'}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let aside;
    	let simplebar;
    	let t0;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	simplebar = new SimpleBar_1({
    			props: {
    				maxHeight: "calc(100vh - 105px)",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			aside = element("aside");
    			create_component(simplebar.$$.fragment);
    			t0 = space();
    			button = element("button");
    			button.textContent = "Add Project";
    			attr_dev(button, "class", "addProject svelte-5tmqxj");
    			add_location(button, file$1, 298, 2, 11471);
    			attr_dev(aside, "class", "sidebar svelte-5tmqxj");
    			add_location(aside, file$1, 133, 0, 3219);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, aside, anchor);
    			mount_component(simplebar, aside, null);
    			append_dev(aside, t0);
    			append_dev(aside, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_5*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const simplebar_changes = {};

    			if (dirty & /*$$scope, $projects, $menuActive, packages*/ 16391) {
    				simplebar_changes.$$scope = { dirty, ctx };
    			}

    			simplebar.$set(simplebar_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(simplebar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(simplebar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(aside);
    			destroy_component(simplebar);
    			mounted = false;
    			dispose();
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
    		SimpleBar: SimpleBar_1,
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
    		if (!document.getElementById("svelte-5tmqxj-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    var bind = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    /*global toString:true*/

    // utils is a library of generic helper functions non-specific to axios

    var toString$1 = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray$1(val) {
      return toString$1.call(val) === '[object Array]';
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString$1.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return (typeof FormData !== 'undefined') && (val instanceof FormData);
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject$2(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a plain Object
     *
     * @param {Object} val The value to test
     * @return {boolean} True if value is a plain Object, otherwise false
     */
    function isPlainObject(val) {
      if (toString$1.call(val) !== '[object Object]') {
        return false;
      }

      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString$1.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString$1.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString$1.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction$1(val) {
      return toString$1.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject$2(val) && isFunction$1(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray$1(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray$1(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     * @return {string} content value without BOM
     */
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    var utils = {
      isArray: isArray$1,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject$2,
      isPlainObject: isPlainObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction$1,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim,
      stripBOM: stripBOM
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code
        };
      };
      return error;
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;

        if (utils.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        if (
          (utils.isBlob(requestData) || utils.isFile(requestData)) &&
          requestData.type
        ) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = unescape(encodeURIComponent(config.auth.password)) || '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        // Listen for ready state
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }

          // The request errored out and we didn't get a response, this will be
          // handled by onerror instead
          // With one exception: request that using file: protocol, most browsers
          // will return status as 0 even though it's a successful request
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
            return;
          }

          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(resolve, reject, response);

          // Clean up request
          request = null;
        };

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(timeoutErrorMessage, config, 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (config.responseType) {
          try {
            request.responseType = config.responseType;
          } catch (e) {
            // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
            // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
            if (config.responseType !== 'json') {
              throw e;
            }
          }
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken) {
          // Handle cancellation
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (!request) {
              return;
            }

            request.abort();
            reject(cancel);
            // Clean up request
            request = null;
          });
        }

        if (!requestData) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    var defaults = {
      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');
        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils.isObject(data)) {
          setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
          return JSON.stringify(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        /*eslint no-param-reassign:0*/
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) { /* Ignore */ }
        }
        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      }
    };

    defaults.headers = {
      common: {
        'Accept': 'application/json, text/plain, */*'
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData(
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData(
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      var valueFromConfig2Keys = ['url', 'method', 'data'];
      var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
      var defaultToConfig2Keys = [
        'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
        'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
        'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
        'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
        'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
      ];
      var directMergeKeys = ['validateStatus'];

      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      }

      utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        }
      });

      utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

      utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      utils.forEach(directMergeKeys, function merge(prop) {
        if (prop in config2) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      var axiosKeys = valueFromConfig2Keys
        .concat(mergeDeepPropertiesKeys)
        .concat(defaultToConfig2Keys)
        .concat(directMergeKeys);

      var otherKeys = Object
        .keys(config1)
        .concat(Object.keys(config2))
        .filter(function filterAxiosKeys(key) {
          return axiosKeys.indexOf(key) === -1;
        });

      utils.forEach(otherKeys, mergeDeepProperties);

      return config;
    };

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof config === 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }

      config = mergeConfig(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      // Hook up interceptors middleware
      var chain = [dispatchRequest, undefined];
      var promise = Promise.resolve(config);

      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });

      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios;

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      return instance;
    }

    // Create the default instance to be exported
    var axios = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios.Axios = Axios_1;

    // Factory for creating new instances
    axios.create = function create(instanceConfig) {
      return createInstance(mergeConfig(axios.defaults, instanceConfig));
    };

    // Expose Cancel & CancelToken
    axios.Cancel = Cancel_1;
    axios.CancelToken = CancelToken_1;
    axios.isCancel = isCancel;

    // Expose all/spread
    axios.all = function all(promises) {
      return Promise.all(promises);
    };
    axios.spread = spread;

    var axios_1 = axios;

    // Allow use of default import syntax in TypeScript
    var _default = axios;
    axios_1.default = _default;

    var axios$1 = axios_1;

    const getPackagesInfo = (data) => {
      return axios$1.post("https://api.npms.io/v2/package/mget", data);
    };

    /* src/components/main.svelte generated by Svelte v3.24.1 */

    const { Object: Object_1, console: console_1$1 } = globals;
    const file$2 = "src/components/main.svelte";

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-12g4ez4-style";
    	style.textContent = ".content.svelte-12g4ez4.svelte-12g4ez4{background-color:#1d1d1d;width:100%;height:100vh;border-left:1px solid #000;padding:10px}.empty.svelte-12g4ez4.svelte-12g4ez4{text-align:center;color:#fff;font-size:15px;display:flex;justify-items:center;flex-direction:column;justify-content:center;align-items:center;height:100%;min-height:100vh}.empty.svelte-12g4ez4 img.svelte-12g4ez4{width:250px;margin-bottom:15px}.empty.svelte-12g4ez4 button.svelte-12g4ez4{cursor:pointer;background-color:#000;border:none;color:#fff;padding:10px;border-radius:5px;display:block}.projectTable.svelte-12g4ez4.svelte-12g4ez4{color:#fff}.projectTable.svelte-12g4ez4 table.svelte-12g4ez4{width:100%;border:none;border-collapse:collapse}.projectTable.svelte-12g4ez4 table thead td.svelte-12g4ez4{border:none;margin:0;padding:15px;background-color:rgba(0, 0, 0, 0.5)}.projectTable.svelte-12g4ez4 table thead td.svelte-12g4ez4:first-child{border-radius:15px 0 0 0}.projectTable.svelte-12g4ez4 table thead td.svelte-12g4ez4:last-child{border-radius:0 15px 0 0}.projectTable.svelte-12g4ez4 table tbody tr td.svelte-12g4ez4{padding:5px 15px;background-color:rgba(0, 0, 0, 0.2)}.projectTable.svelte-12g4ez4 table tbody tr.svelte-12g4ez4:nth-child(2n){background-color:rgba(0, 0, 0, 0.21)}.projectTable.svelte-12g4ez4 table tbody tr:last-child td.svelte-12g4ez4:first-child{border-radius:0 0 0 15px}.projectTable.svelte-12g4ez4 table tbody tr:last-child td.svelte-12g4ez4:last-child{border-radius:0 0 15px 0}.projectTable__title.svelte-12g4ez4.svelte-12g4ez4{padding-left:15px}.skeleton.svelte-12g4ez4.svelte-12g4ez4{min-width:30px;background-color:rgba(255, 255, 255, 0.5);display:inline-block;height:15px;-webkit-animation:svelte-12g4ez4-change-opacity 2s linear infinite;animation:svelte-12g4ez4-change-opacity 2s linear infinite;opacity:0.3}@keyframes svelte-12g4ez4-change-opacity{0%{opacity:0.3}50%{opacity:1}100%{opacity:0.3}}.projectAction.svelte-12g4ez4.svelte-12g4ez4{position:relative;display:inline-block;width:25px;height:25px;padding:4px;border-radius:5px;background-color:rgba(255, 255, 255, 0.8);margin-right:5px}.projectAction.svelte-12g4ez4 .tooltiptext.svelte-12g4ez4{visibility:hidden;width:120px;background-color:#555;color:#fff;text-align:center;padding:5px 0;border-radius:6px;position:absolute;z-index:1;bottom:125%;left:50%;margin-left:-60px;opacity:0;transition:opacity 0.3s}.projectAction.svelte-12g4ez4 .tooltiptext.svelte-12g4ez4::after{content:\"\";position:absolute;top:100%;left:50%;margin-left:-5px;border-width:5px;border-style:solid;border-color:#555 transparent transparent transparent}.projectAction.svelte-12g4ez4:hover .tooltiptext.svelte-12g4ez4{visibility:visible;opacity:1}.projectTable__versionCheck.svelte-12g4ez4.svelte-12g4ez4{width:16px;height:16px;display:inline-block;fill:none;stroke:#fff;stroke-width:3px;position:relative;top:2px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5zdmVsdGUiLCJzb3VyY2VzIjpbIm1haW4uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCBTaW1wbGVCYXIgZnJvbSBcIi4uL2NvbXBvbmVudHMvU2ltcGxlQmFyLnN2ZWx0ZVwiO1xuICBpbXBvcnQgeyBwcm9qZWN0cywgbWVudUFjdGl2ZSB9IGZyb20gXCIuLi9zdG9yZVwiO1xuICBpbXBvcnQgeyBnZXRQYWNrYWdlc0luZm8gfSBmcm9tIFwiLi4vYXBpXCI7XG4gIGltcG9ydCB7IG9wZW5EaXJlY3RvcnksIGdldFByb2plY3RQYWNrYWdlcyB9IGZyb20gXCIuLi91dGlscy9zaGVsbC5qc1wiO1xuICBsZXQgY3VycmVudFByb2plY3RJRCA9IGZhbHNlO1xuICBsZXQgY3VycmVudFByb2plY3QgPSB7fTtcbiAgbGV0IHByb2plY3QgPSB7fTtcbiAgbGV0IHBhY2thZ2VzID0gW107XG4gIGxldCBwYWNrYWdlc1Bvc3QgPSBbXTtcbiAgbGV0IG5ld0RhdGEgPSBbXTtcbiAgbGV0IGRlcGVuZGVuY2llcyA9IFtdO1xuICBsZXQgZGV2RGVwZW5kZW5jaWVzID0gW107XG4gIG1lbnVBY3RpdmUuc3Vic2NyaWJlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgIGN1cnJlbnRQcm9qZWN0SUQgPSB2YWx1ZSA/IHZhbHVlLnNwbGl0KFwiX1wiKVsxXSA6IGZhbHNlO1xuICAgIGN1cnJlbnRQcm9qZWN0ID0gJHByb2plY3RzLmZpbHRlcigoaXRlbSkgPT4ge1xuICAgICAgcmV0dXJuIGl0ZW0uaWQgPT09IHBhcnNlSW50KGN1cnJlbnRQcm9qZWN0SUQpO1xuICAgIH0pWzBdO1xuICAgIGlmIChjdXJyZW50UHJvamVjdCkge1xuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGdldFByb2plY3RQYWNrYWdlcyhjdXJyZW50UHJvamVjdC5wYXRoKS50aGVuKFxuICAgICAgICAocmVzKSA9PiByZXNcbiAgICAgICk7XG4gICAgICBwcm9qZWN0ID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgIHBhY2thZ2VzID0gW107XG4gICAgICBwYWNrYWdlc1Bvc3QgPSBbXTtcbiAgICAgIG5ld0RhdGEgPSBbXTtcbiAgICAgIGRlcGVuZGVuY2llcyA9IE9iamVjdC5lbnRyaWVzKHByb2plY3QuZGVwZW5kZW5jaWVzKTtcbiAgICAgIGRldkRlcGVuZGVuY2llcyA9IE9iamVjdC5lbnRyaWVzKHByb2plY3QuZGV2RGVwZW5kZW5jaWVzKTtcbiAgICAgIGxldCBpID0gMTtcbiAgICAgIGZvciBhd2FpdCAobGV0IGl0ZW0gb2YgZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIHBhY2thZ2VzID0gW1xuICAgICAgICAgIC4uLnBhY2thZ2VzLFxuICAgICAgICAgIHsgaWQ6IGksIG5hbWU6IGl0ZW1bMF0sIGN1cnJlbnQ6IGl0ZW1bMV0sIGRldjogZmFsc2UgfSxcbiAgICAgICAgXTtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgICAgZm9yIGF3YWl0IChsZXQgaXRlbSBvZiBkZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgcGFja2FnZXMgPSBbXG4gICAgICAgICAgLi4ucGFja2FnZXMsXG4gICAgICAgICAgeyBpZDogaSwgbmFtZTogaXRlbVswXSwgY3VycmVudDogaXRlbVsxXSwgZGV2OiB0cnVlIH0sXG4gICAgICAgIF07XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICAgIGZvciBhd2FpdCAobGV0IHBhY2sgb2YgcGFja2FnZXMpIHtcbiAgICAgICAgcGFja2FnZXNQb3N0ID0gWy4uLnBhY2thZ2VzUG9zdCwgcGFjay5uYW1lXTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGdldFBhY2thZ2VzSW5mbyhwYWNrYWdlc1Bvc3QpLnRoZW4oYXN5bmMgKHJlcykgPT4ge1xuICAgICAgICAvLyBjb25zdCBkYXRhSW5mbyA9IE9iamVjdC5lbnRyaWVzKHJlcy5kYXRhKTtcbiAgICAgICAgZm9yIGF3YWl0IChsZXQgaXRlbSBvZiBwYWNrYWdlcykge1xuICAgICAgICAgIG5ld0RhdGEgPSBbLi4ubmV3RGF0YSwgeyAuLi5pdGVtLCBkYXRhOiByZXMuZGF0YVtpdGVtLm5hbWVdIH1dO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHBhY2thZ2VzID0gbmV3RGF0YTtcbiAgICB9XG4gIH0pO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZSBsYW5nPVwic2Nzc1wiPi5jb250ZW50IHtcbiAgYmFja2dyb3VuZC1jb2xvcjogIzFkMWQxZDtcbiAgd2lkdGg6IDEwMCU7XG4gIGhlaWdodDogMTAwdmg7XG4gIGJvcmRlci1sZWZ0OiAxcHggc29saWQgIzAwMDtcbiAgcGFkZGluZzogMTBweDsgfVxuXG4uZW1wdHkge1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIGNvbG9yOiAjZmZmO1xuICBmb250LXNpemU6IDE1cHg7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktaXRlbXM6IGNlbnRlcjtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGhlaWdodDogMTAwJTtcbiAgbWluLWhlaWdodDogMTAwdmg7IH1cbiAgLmVtcHR5IGltZyB7XG4gICAgd2lkdGg6IDI1MHB4O1xuICAgIG1hcmdpbi1ib3R0b206IDE1cHg7IH1cbiAgLmVtcHR5IGJ1dHRvbiB7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIGJhY2tncm91bmQtY29sb3I6ICMwMDA7XG4gICAgYm9yZGVyOiBub25lO1xuICAgIGNvbG9yOiAjZmZmO1xuICAgIHBhZGRpbmc6IDEwcHg7XG4gICAgYm9yZGVyLXJhZGl1czogNXB4O1xuICAgIGRpc3BsYXk6IGJsb2NrOyB9XG5cbi5wcm9qZWN0VGFibGUge1xuICBjb2xvcjogI2ZmZjsgfVxuICAucHJvamVjdFRhYmxlIHRhYmxlIHtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBib3JkZXI6IG5vbmU7XG4gICAgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTsgfVxuICAgIC5wcm9qZWN0VGFibGUgdGFibGUgdGhlYWQgdGQge1xuICAgICAgYm9yZGVyOiBub25lO1xuICAgICAgbWFyZ2luOiAwO1xuICAgICAgcGFkZGluZzogMTVweDtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC41KTsgfVxuICAgICAgLnByb2plY3RUYWJsZSB0YWJsZSB0aGVhZCB0ZDpmaXJzdC1jaGlsZCB7XG4gICAgICAgIGJvcmRlci1yYWRpdXM6IDE1cHggMCAwIDA7IH1cbiAgICAgIC5wcm9qZWN0VGFibGUgdGFibGUgdGhlYWQgdGQ6bGFzdC1jaGlsZCB7XG4gICAgICAgIGJvcmRlci1yYWRpdXM6IDAgMTVweCAwIDA7IH1cbiAgICAucHJvamVjdFRhYmxlIHRhYmxlIHRib2R5IHRyIHRkIHtcbiAgICAgIHBhZGRpbmc6IDVweCAxNXB4O1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjIpOyB9XG4gICAgLnByb2plY3RUYWJsZSB0YWJsZSB0Ym9keSB0cjpudGgtY2hpbGQoMm4pIHtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC4yMSk7IH1cbiAgICAucHJvamVjdFRhYmxlIHRhYmxlIHRib2R5IHRyOmxhc3QtY2hpbGQgdGQ6Zmlyc3QtY2hpbGQge1xuICAgICAgYm9yZGVyLXJhZGl1czogMCAwIDAgMTVweDsgfVxuICAgIC5wcm9qZWN0VGFibGUgdGFibGUgdGJvZHkgdHI6bGFzdC1jaGlsZCB0ZDpsYXN0LWNoaWxkIHtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDAgMCAxNXB4IDA7IH1cblxuLnByb2plY3RUYWJsZV9fdGl0bGUge1xuICBwYWRkaW5nLWxlZnQ6IDE1cHg7IH1cblxuLnNrZWxldG9uIHtcbiAgbWluLXdpZHRoOiAzMHB4O1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNSk7XG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgaGVpZ2h0OiAxNXB4O1xuICAtd2Via2l0LWFuaW1hdGlvbjogY2hhbmdlLW9wYWNpdHkgMnMgbGluZWFyIGluZmluaXRlO1xuICBhbmltYXRpb246IGNoYW5nZS1vcGFjaXR5IDJzIGxpbmVhciBpbmZpbml0ZTtcbiAgb3BhY2l0eTogMC4zOyB9XG5cbkBrZXlmcmFtZXMgY2hhbmdlLW9wYWNpdHkge1xuICAwJSB7XG4gICAgb3BhY2l0eTogMC4zOyB9XG4gIDUwJSB7XG4gICAgb3BhY2l0eTogMTsgfVxuICAxMDAlIHtcbiAgICBvcGFjaXR5OiAwLjM7IH0gfVxuXG4ucHJvamVjdEFjdGlvbiB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xuICB3aWR0aDogMjVweDtcbiAgaGVpZ2h0OiAyNXB4O1xuICBwYWRkaW5nOiA0cHg7XG4gIGJvcmRlci1yYWRpdXM6IDVweDtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjgpO1xuICBtYXJnaW4tcmlnaHQ6IDVweDsgfVxuICAucHJvamVjdEFjdGlvbiAudG9vbHRpcHRleHQge1xuICAgIHZpc2liaWxpdHk6IGhpZGRlbjtcbiAgICB3aWR0aDogMTIwcHg7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogIzU1NTtcbiAgICBjb2xvcjogI2ZmZjtcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgcGFkZGluZzogNXB4IDA7XG4gICAgYm9yZGVyLXJhZGl1czogNnB4O1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICB6LWluZGV4OiAxO1xuICAgIGJvdHRvbTogMTI1JTtcbiAgICBsZWZ0OiA1MCU7XG4gICAgbWFyZ2luLWxlZnQ6IC02MHB4O1xuICAgIG9wYWNpdHk6IDA7XG4gICAgdHJhbnNpdGlvbjogb3BhY2l0eSAwLjNzOyB9XG4gICAgLnByb2plY3RBY3Rpb24gLnRvb2x0aXB0ZXh0OjphZnRlciB7XG4gICAgICBjb250ZW50OiBcIlwiO1xuICAgICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgICAgdG9wOiAxMDAlO1xuICAgICAgbGVmdDogNTAlO1xuICAgICAgbWFyZ2luLWxlZnQ6IC01cHg7XG4gICAgICBib3JkZXItd2lkdGg6IDVweDtcbiAgICAgIGJvcmRlci1zdHlsZTogc29saWQ7XG4gICAgICBib3JkZXItY29sb3I6ICM1NTUgdHJhbnNwYXJlbnQgdHJhbnNwYXJlbnQgdHJhbnNwYXJlbnQ7IH1cbiAgLnByb2plY3RBY3Rpb246aG92ZXIgLnRvb2x0aXB0ZXh0IHtcbiAgICB2aXNpYmlsaXR5OiB2aXNpYmxlO1xuICAgIG9wYWNpdHk6IDE7IH1cblxuLnByb2plY3RUYWJsZV9fdmVyc2lvbkNoZWNrIHtcbiAgd2lkdGg6IDE2cHg7XG4gIGhlaWdodDogMTZweDtcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xuICBmaWxsOiBub25lO1xuICBzdHJva2U6ICNmZmY7XG4gIHN0cm9rZS13aWR0aDogM3B4O1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIHRvcDogMnB4OyB9XG48L3N0eWxlPlxuXG48ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICA8U2ltcGxlQmFyIG1heEhlaWdodD17J2NhbGMoMTAwdmggLSAyMHB4KSd9PlxuICAgIHsjaWYgIWN1cnJlbnRQcm9qZWN0fVxuICAgICAgPHNlY3Rpb24gY2xhc3M9XCJlbXB0eVwiPlxuICAgICAgICA8aW1nIHNyYz1cIi4vaW1hZ2VzL2FkZC5wbmdcIiB3aWR0aD1cIjMwMFwiIGFsdD1cIlwiIC8+XG4gICAgICAgIDxoMT5TZWxlY3QgUHJvamVjdCB0byBzdGFydDwvaDE+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgb3BlbkRpcmVjdG9yeSgpXG4gICAgICAgICAgICAgIC50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5jYW5jZWxlZCkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSByZXN1bHQuZmlsZVBhdGhzWzBdO1xuICAgICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGhBcnJheSA9IHJlc3VsdC5maWxlUGF0aHNbMF0uc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2plY3ROYW1lID0gcHJvamVjdFBhdGhBcnJheVtwcm9qZWN0UGF0aEFycmF5Lmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgcHJvamVjdHMuc2V0KFtcbiAgICAgICAgICAgICAgICAgICAgLi4uJHByb2plY3RzLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgaWQ6ICRwcm9qZWN0c1skcHJvamVjdHMubGVuZ3RoIC0gMV1cbiAgICAgICAgICAgICAgICAgICAgICAgID8gJHByb2plY3RzWyRwcm9qZWN0cy5sZW5ndGggLSAxXS5pZCArIDFcbiAgICAgICAgICAgICAgICAgICAgICAgIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBwcm9qZWN0TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9qZWN0UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Byb2plY3RzJywgSlNPTi5zdHJpbmdpZnkoJHByb2plY3RzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH19PlxuICAgICAgICAgIEFkZCBQcm9qZWN0XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9zZWN0aW9uPlxuICAgIHs6ZWxzZX1cbiAgICAgIDxzZWN0aW9uIGNsYXNzPVwicHJvamVjdFRhYmxlXCI+XG4gICAgICAgIDxoMSBjbGFzcz1cInByb2plY3RUYWJsZV9fdGl0bGVcIj57Y3VycmVudFByb2plY3QubmFtZX08L2gxPlxuICAgICAgICA8dGFibGU+XG4gICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICA8dGQ+UGFja2FnZTwvdGQ+XG4gICAgICAgICAgICAgIDx0ZD5WZXJzaW9uPC90ZD5cbiAgICAgICAgICAgICAgPHRkPmVudjwvdGQ+XG4gICAgICAgICAgICAgIDx0ZD5JbmZvPC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICB7I2lmIHBhY2thZ2VzfVxuICAgICAgICAgICAgICB7I2VhY2ggcGFja2FnZXMgYXMgeyBpZCwgbmFtZSwgY3VycmVudCwgZGV2LCBkYXRhIH19XG4gICAgICAgICAgICAgICAgPHRyIGlkPXtgcGFja2FnZV8ke2lkfWB9PlxuICAgICAgICAgICAgICAgICAgPHRkPntuYW1lfTwvdGQ+XG4gICAgICAgICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgICAgICAgIHtjdXJyZW50fVxuICAgICAgICAgICAgICAgICAgICB7I2lmICFkYXRhfVxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic2tlbGV0b25cIiAvPlxuICAgICAgICAgICAgICAgICAgICB7OmVsc2UgaWYgY3VycmVudC5yZXBsYWNlKCdeJywgJycpID09PSBkYXRhLmNvbGxlY3RlZC5tZXRhZGF0YS52ZXJzaW9ufVxuICAgICAgICAgICAgICAgICAgICAgIDxzdmdcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwicHJvamVjdFRhYmxlX192ZXJzaW9uQ2hlY2tcIlxuICAgICAgICAgICAgICAgICAgICAgICAgdmlld0JveD1cIjAgMCAyNCAyNFwiXG4gICAgICAgICAgICAgICAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPVwiTTIyIDExLjA4VjEyYTEwIDEwIDAgMSAxLTUuOTMtOS4xNFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cG9seWxpbmUgcG9pbnRzPVwiMjIgNCAxMiAxNC4wMSA5IDExLjAxXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgICAgICAgICAgICAgezplbHNlfShMYXRlc3Qge2RhdGEuY29sbGVjdGVkLm1ldGFkYXRhLnZlcnNpb259KXsvaWZ9XG4gICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICB7I2lmIGRldn1kZXZ7L2lmfVxuICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgeyNpZiAhZGF0YX1cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInNrZWxldG9uXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgezplbHNlfVxuICAgICAgICAgICAgICAgICAgICAgIDxhXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInByb2plY3RBY3Rpb25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgaHJlZj17ZGF0YS5jb2xsZWN0ZWQubWV0YWRhdGEubGlua3MuYnVnc31cbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiSXNzdWVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzdmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdmlld0JveD1cIjAgMCAyMDQ4IDIwNDhcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZD1cIk0xNjA4IDg5N3E2NSAyIDEyMiAyNy41dDk5IDY4LjUgNjYuNSAxMDAuNVQxOTIwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMTIxNnYxOTJoLTEyOHYtMTkycTAtMzItMTAuNS02MS41dC0yOS01NC00NC41LTQyLTU3LTI2LjVxNlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDI5IDkuNSA1OS41dDMuNSA2MC41djI1NnEwIDctMSAxM3QtMiAxM2w2LTZxNjAgNjAgOTJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxMzh0MzIgMTYzLTMyIDE2Mi41LTkyIDEzNy41bC05MC05MHE0Mi00MlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDY0LTk1LjV0MjItMTEzLjVxMC02OC0zMS0xMzItMzEgMTAwLTkwLjUgMTgzVDE0MDJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxOTIzdC0xNzYuNSA5Mi0yMDEuNVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDMzLTIwMS41LTMzLTE3Ni41LTkyLTEzOS41LTE0Mi05MC41LTE4M3EtMzEgNjQtMzFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxMzIgMCA2MCAyMiAxMTMuNXQ2NCA5NS41bC05MFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDkwcS02MC02MC05Mi41LTEzNy41VDI1NiAxNzI5dDMyLjUtMTYzIDkyLjUtMTM4bDZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA2cS0xLTctMi0xM3QtMS0xM3YtMjU2cTAtMzAgMy41LTYwLjV0OS41LTU5LjVxLTMxXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOS01NyAyNi41dC00NC41IDQyLTI5IDU0VDI1NiAxMjE2djE5MkgxMjh2LTE5MnEwLTY1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMjQuNS0xMjIuNVQyMTkgOTkzdDk5LTY4LjVUNDQwIDg5N3EzMS03MFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDgwLTEzNS01Ny0xMC0xMDUuNS0zOC41VDMzMSA2NTN0LTU1LTk0LjVUMjU2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgNDQ4VjI1NmgxMjh2MTkycTAgNDAgMTUgNzV0NDEgNjEgNjEgNDEgNzVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxNWg2NHYzcTQ3LTM1IDk2LTU5LTE1LTMyLTIzLjUtNjYuNVQ3MDQgNDQ4cTAtNzBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAzMS0xMzVMNTk1IDE3M2w5MC05MCAxMjcgMTI3cTQ1LTM5IDk4LjUtNjAuNVQxMDI0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMTI4dDExMy41IDIxLjVUMTIzNiAyMTBsMTI3LTEyNyA5MCA5MC0xNDAgMTQwcTMxIDY1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMzEgMTM1IDAgMzUtOC41IDY5LjVUMTMxMiA1ODRxMjYgMTMgNDkuNSAyNy41VDE0MDhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA2NDN2LTNoNjRxNDAgMCA3NS0xNXQ2MS00MSA0MS02MSAxNS03NVYyNTZoMTI4djE5MnEwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgNTgtMjAgMTEwLjV0LTU1IDk0LjUtODMuNSA3MC41VDE1MjggNzYycTQ5IDY1IDgwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMTM1em0tNTg0LTY0MXEtNDAgMC03NSAxNXQtNjEgNDEtNDEgNjEtMTUgNzVxMCA1MCAyNFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDkwIDQyLTExIDgzLjUtMTcuNXQ4NC41LTYuNSA4NC41IDYuNVQxMTkyIDUzOHEyNC00MFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDI0LTkwIDAtNDAtMTUtNzV0LTQxLTYxLTYxLTQxLTc1LTE1em01MTJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA4OTZxMC0xMDQtNDEtMTk3dC0xMTAuNS0xNjNUMTIyMiA2ODF0LTE5OC00MS0xOThcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA0MS0xNjIuNSAxMTFUNTUzIDk1NXQtNDEgMTk3djI1NnEwIDEwNiA0MC41IDE5OXQxMTBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxNjIuNSAxNjIuNSAxMTAgMTk5IDQwLjUgMTk5LTQwLjUgMTYyLjUtMTEwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMTEwLTE2Mi41IDQwLjUtMTk5di0yNTZ6XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvc3ZnPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0b29sdGlwdGV4dFwiPklzc3VlPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICA8YVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJwcm9qZWN0QWN0aW9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhyZWY9e2RhdGEuY29sbGVjdGVkLm1ldGFkYXRhLmxpbmtzLmhvbWVwYWdlfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJIb21lIFBhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzdmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdmlld0JveD1cIjAgMCAzMiAzMlwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkPVwiTSAxNiAyLjU5Mzc1IEwgMTUuMjgxMjUgMy4yODEyNSBMIDIuMjgxMjVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxNi4yODEyNSBMIDMuNzE4NzUgMTcuNzE4NzUgTCA1IDE2LjQzNzUgTCA1IDI4IEwgMTRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAyOCBMIDE0IDE4IEwgMTggMTggTCAxOCAyOCBMIDI3IDI4IEwgMjcgMTYuNDM3NSBMXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMjguMjgxMjUgMTcuNzE4NzUgTCAyOS43MTg3NSAxNi4yODEyNSBMIDE2LjcxODc1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMy4yODEyNSBaIE0gMTYgNS40Mzc1IEwgMjUgMTQuNDM3NSBMIDI1IDI2IEwgMjAgMjYgTFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDIwIDE2IEwgMTIgMTYgTCAxMiAyNiBMIDcgMjYgTCA3IDE0LjQzNzUgWlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidG9vbHRpcHRleHRcIj5Ib21lIFBhZ2U8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgIDxhXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInByb2plY3RBY3Rpb25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgaHJlZj17ZGF0YS5jb2xsZWN0ZWQubWV0YWRhdGEubGlua3MubnBtfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJOcG1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzdmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdmlld0JveD1cIjAgMCAzMiAzMlwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkPVwiTSAwIDEwIEwgMCAyMSBMIDkgMjEgTCA5IDIzIEwgMTYgMjMgTCAxNiAyMSBMIDMyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMjEgTCAzMiAxMCBMIDAgMTAgeiBNIDEuNzc3MzQzOCAxMS43NzczNDQgTFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDguODg4NjcxOSAxMS43NzczNDQgTCA4Ljg5MDYyNSAxMS43NzczNDQgTCA4Ljg5MDYyNVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDE5LjQ0NTMxMiBMIDcuMTExMzI4MSAxOS40NDUzMTIgTCA3LjExMTMyODFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxMy41NTY2NDEgTCA1LjMzMzk4NDQgMTMuNTU2NjQxIEwgNS4zMzM5ODQ0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMTkuNDQ1MzEyIEwgMS43NzczNDM4IDE5LjQ0NTMxMiBMIDEuNzc3MzQzOFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDExLjc3NzM0NCB6IE0gMTAuNjY3OTY5IDExLjc3NzM0NCBMIDE3Ljc3NzM0NFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDExLjc3NzM0NCBMIDE3Ljc3OTI5NyAxMS43NzczNDQgTCAxNy43NzkyOTdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxOS40NDMzNTkgTCAxNC4yMjI2NTYgMTkuNDQzMzU5IEwgMTQuMjIyNjU2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMjEuMjIyNjU2IEwgMTAuNjY3OTY5IDIxLjIyMjY1NiBMIDEwLjY2Nzk2OVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDExLjc3NzM0NCB6IE0gMTkuNTU2NjQxIDExLjc3NzM0NCBMIDMwLjIyMjY1NlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDExLjc3NzM0NCBMIDMwLjIyNDYwOSAxMS43NzczNDQgTCAzMC4yMjQ2MDlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxOS40NDUzMTIgTCAyOC40NDUzMTIgMTkuNDQ1MzEyIEwgMjguNDQ1MzEyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMTMuNTU2NjQxIEwgMjYuNjY3OTY5IDEzLjU1NjY0MSBMIDI2LjY2Nzk2OVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDE5LjQ0NTMxMiBMIDI0Ljg5MDYyNSAxOS40NDUzMTIgTCAyNC44OTA2MjVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxMy41NTY2NDEgTCAyMy4xMTEzMjggMTMuNTU2NjQxIEwgMjMuMTExMzI4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMTkuNDQ1MzEyIEwgMTkuNTU2NjQxIDE5LjQ0NTMxMiBMIDE5LjU1NjY0MVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDExLjc3NzM0NCB6IE0gMTQuMjIyNjU2IDEzLjU1NjY0MSBMIDE0LjIyMjY1NlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDE3LjY2Nzk2OSBMIDE2IDE3LjY2Nzk2OSBMIDE2IDEzLjU1NjY0MSBMIDE0LjIyMjY1NlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEzLjU1NjY0MSB6XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvc3ZnPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0b29sdGlwdGV4dFwiPk5wbTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgPGFcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwicHJvamVjdEFjdGlvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICBocmVmPXtkYXRhLmNvbGxlY3RlZC5tZXRhZGF0YS5saW5rcy5yZXBvc2l0b3J5fVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJSZXBvc2l0b3J5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3ZnXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXdCb3g9XCIwIDAgNDggNDdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsbD1cIm5vbmVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxSdWxlPVwiZXZlbm9kZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Ryb2tlPVwibm9uZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Ryb2tlV2lkdGg9XCIxXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw9XCIjMDAwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybT1cInRyYW5zbGF0ZSgtNzAwLjAwMDAwMCwgLTU2MC4wMDAwMDApXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkPVwiTTcyMy45OTg1LDU2MCBDNzEwLjc0Niw1NjAgNzAwLDU3MC43ODcwOTJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzAwLDU4NC4wOTY2NDQgQzcwMCw1OTQuNzQwNjcxIDcwNi44NzYsNjAzLjc3MTgzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDcxNi40MTQ1LDYwNi45NTg0MTIgQzcxNy42MTQ1LDYwNy4xNzk3ODZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzE4LjA1MjUsNjA2LjQzNTg0OSA3MTguMDUyNSw2MDUuNzk3MzI4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEM3MTguMDUyNSw2MDUuMjI1MDY4IDcxOC4wMzE1LDYwMy43MTAwODZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzE4LjAxOTUsNjAxLjY5OTY0OCBDNzExLjM0Myw2MDMuMTU1ODk4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDcwOS45MzQ1LDU5OC40NjkzOTQgNzA5LjkzNDUsNTk4LjQ2OTM5NFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDNzA4Ljg0NCw1OTUuNjg2NDA1IDcwNy4yNzA1LDU5NC45NDU0OFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA3MDcuMjcwNSw1OTQuOTQ1NDggQzcwNS4wOTEsNTkzLjQ1MDA3NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA3MDcuNDM1NSw1OTMuNDgwMTk0IDcwNy40MzU1LDU5My40ODAxOTRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQzcwOS44NDMsNTkzLjY1MDM2NiA3MTEuMTEwNSw1OTUuOTYzNDk5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDcxMS4xMTA1LDU5NS45NjM0OTkgQzcxMy4yNTI1LDU5OS42NDU1MzhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzE2LjcyOCw1OTguNTgyMzQgNzE4LjA5Niw1OTcuOTY0OTAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEM3MTguMzEzNSw1OTYuNDA3NzU0IDcxOC45MzQ1LDU5NS4zNDYwNjJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzE5LjYyLDU5NC43NDM2ODMgQzcxNC4yOTA1LDU5NC4xMzUyODFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzA4LjY4OCw1OTIuMDY5MTIzIDcwOC42ODgsNTgyLjgzNjE2N1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDNzA4LjY4OCw1ODAuMjA1Mjc5IDcwOS42MjI1LDU3OC4wNTQ3ODhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzExLjE1ODUsNTc2LjM2OTYzNCBDNzEwLjkxMSw1NzUuNzU5NzI2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDcxMC4wODc1LDU3My4zMTEwNTggNzExLjM5MjUsNTY5Ljk5MzQ1OFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDNzExLjM5MjUsNTY5Ljk5MzQ1OCA3MTMuNDA4NSw1NjkuMzQ1OTAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDcxNy45OTI1LDU3Mi40NjMyMSBDNzE5LjkwOCw1NzEuOTI4NTk5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDcyMS45Niw1NzEuNjYyMDQ3IDcyNC4wMDE1LDU3MS42NTE1MDVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQzcyNi4wNCw1NzEuNjYyMDQ3IDcyOC4wOTM1LDU3MS45Mjg1OTlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzMwLjAxMDUsNTcyLjQ2MzIxIEM3MzQuNTkxNSw1NjkuMzQ1OTAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDczNi42MDMsNTY5Ljk5MzQ1OCA3MzYuNjAzLDU2OS45OTM0NThcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQzczNy45MTI1LDU3My4zMTEwNTggNzM3LjA4OSw1NzUuNzU5NzI2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDczNi44NDE1LDU3Ni4zNjk2MzQgQzczOC4zODA1LDU3OC4wNTQ3ODhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzM5LjMwOSw1ODAuMjA1Mjc5IDczOS4zMDksNTgyLjgzNjE2N1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDNzM5LjMwOSw1OTIuMDkxNzEyIDczMy42OTc1LDU5NC4xMjkyNTdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzI4LjM1MTUsNTk0LjcyNTYxMiBDNzI5LjIxMjUsNTk1LjQ2OTU0OVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA3MjkuOTgwNSw1OTYuOTM5MzUzIDcyOS45ODA1LDU5OS4xODc3M1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDNzI5Ljk4MDUsNjAyLjQwODk0OSA3MjkuOTUwNSw2MDUuMDA2NzA2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDcyOS45NTA1LDYwNS43OTczMjggQzcyOS45NTA1LDYwNi40NDE4NzNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNzMwLjM4MjUsNjA3LjE5MTgzNCA3MzEuNjAwNSw2MDYuOTU1NFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDNzQxLjEzLDYwMy43NjI3OTQgNzQ4LDU5NC43Mzc2NTkgNzQ4LDU4NC4wOTY2NDRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQzc0OCw1NzAuNzg3MDkyIDczNy4yNTQsNTYwIDcyMy45OTg1LDU2MFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidG9vbHRpcHRleHRcIj5SZXBvc2l0b3J5PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgey9pZn1cbiAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgey9lYWNofVxuICAgICAgICAgICAgey9pZn1cbiAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICA8L3RhYmxlPlxuICAgICAgPC9zZWN0aW9uPlxuICAgIHsvaWZ9XG4gIDwvU2ltcGxlQmFyPlxuPC9kaXY+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBeURtQixRQUFRLDhCQUFDLENBQUMsQUFDM0IsZ0JBQWdCLENBQUUsT0FBTyxDQUN6QixLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxLQUFLLENBQ2IsV0FBVyxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUMzQixPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFbEIsTUFBTSw4QkFBQyxDQUFDLEFBQ04sVUFBVSxDQUFFLE1BQU0sQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxTQUFTLENBQUUsSUFBSSxDQUNmLE9BQU8sQ0FBRSxJQUFJLENBQ2IsYUFBYSxDQUFFLE1BQU0sQ0FDckIsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsZUFBZSxDQUFFLE1BQU0sQ0FDdkIsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsTUFBTSxDQUFFLElBQUksQ0FDWixVQUFVLENBQUUsS0FBSyxBQUFFLENBQUMsQUFDcEIscUJBQU0sQ0FBQyxHQUFHLGVBQUMsQ0FBQyxBQUNWLEtBQUssQ0FBRSxLQUFLLENBQ1osYUFBYSxDQUFFLElBQUksQUFBRSxDQUFDLEFBQ3hCLHFCQUFNLENBQUMsTUFBTSxlQUFDLENBQUMsQUFDYixNQUFNLENBQUUsT0FBTyxDQUNmLGdCQUFnQixDQUFFLElBQUksQ0FDdEIsTUFBTSxDQUFFLElBQUksQ0FDWixLQUFLLENBQUUsSUFBSSxDQUNYLE9BQU8sQ0FBRSxJQUFJLENBQ2IsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsT0FBTyxDQUFFLEtBQUssQUFBRSxDQUFDLEFBRXJCLGFBQWEsOEJBQUMsQ0FBQyxBQUNiLEtBQUssQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNkLDRCQUFhLENBQUMsS0FBSyxlQUFDLENBQUMsQUFDbkIsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLGVBQWUsQ0FBRSxRQUFRLEFBQUUsQ0FBQyxBQUM1Qiw0QkFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxlQUFDLENBQUMsQUFDNUIsTUFBTSxDQUFFLElBQUksQ0FDWixNQUFNLENBQUUsQ0FBQyxDQUNULE9BQU8sQ0FBRSxJQUFJLENBQ2IsZ0JBQWdCLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFBRSxDQUFDLEFBQ3ZDLDRCQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxpQkFBRSxZQUFZLEFBQUMsQ0FBQyxBQUN4QyxhQUFhLENBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFFLENBQUMsQUFDOUIsNEJBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGlCQUFFLFdBQVcsQUFBQyxDQUFDLEFBQ3ZDLGFBQWEsQ0FBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUUsQ0FBQyxBQUNoQyw0QkFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsZUFBQyxDQUFDLEFBQy9CLE9BQU8sQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUNqQixnQkFBZ0IsQ0FBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUFFLENBQUMsQUFDekMsNEJBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGlCQUFFLFdBQVcsRUFBRSxDQUFDLEFBQUMsQ0FBQyxBQUMxQyxnQkFBZ0IsQ0FBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxBQUFFLENBQUMsQUFDMUMsNEJBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsV0FBVyxDQUFDLGlCQUFFLFlBQVksQUFBQyxDQUFDLEFBQ3RELGFBQWEsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUM5Qiw0QkFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxXQUFXLENBQUMsaUJBQUUsV0FBVyxBQUFDLENBQUMsQUFDckQsYUFBYSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQUFBRSxDQUFDLEFBRWxDLG9CQUFvQiw4QkFBQyxDQUFDLEFBQ3BCLFlBQVksQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUV2QixTQUFTLDhCQUFDLENBQUMsQUFDVCxTQUFTLENBQUUsSUFBSSxDQUNmLGdCQUFnQixDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzFDLE9BQU8sQ0FBRSxZQUFZLENBQ3JCLE1BQU0sQ0FBRSxJQUFJLENBQ1osaUJBQWlCLENBQUUsNkJBQWMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FDcEQsU0FBUyxDQUFFLDZCQUFjLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQzVDLE9BQU8sQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUVqQixXQUFXLDZCQUFlLENBQUMsQUFDekIsRUFBRSxBQUFDLENBQUMsQUFDRixPQUFPLENBQUUsR0FBRyxBQUFFLENBQUMsQUFDakIsR0FBRyxBQUFDLENBQUMsQUFDSCxPQUFPLENBQUUsQ0FBQyxBQUFFLENBQUMsQUFDZixJQUFJLEFBQUMsQ0FBQyxBQUNKLE9BQU8sQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUFDLENBQUMsQUFFckIsY0FBYyw4QkFBQyxDQUFDLEFBQ2QsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsT0FBTyxDQUFFLFlBQVksQ0FDckIsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLE9BQU8sQ0FBRSxHQUFHLENBQ1osYUFBYSxDQUFFLEdBQUcsQ0FDbEIsZ0JBQWdCLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDMUMsWUFBWSxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBQ3BCLDZCQUFjLENBQUMsWUFBWSxlQUFDLENBQUMsQUFDM0IsVUFBVSxDQUFFLE1BQU0sQ0FDbEIsS0FBSyxDQUFFLEtBQUssQ0FDWixnQkFBZ0IsQ0FBRSxJQUFJLENBQ3RCLEtBQUssQ0FBRSxJQUFJLENBQ1gsVUFBVSxDQUFFLE1BQU0sQ0FDbEIsT0FBTyxDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQ2QsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsT0FBTyxDQUFFLENBQUMsQ0FDVixNQUFNLENBQUUsSUFBSSxDQUNaLElBQUksQ0FBRSxHQUFHLENBQ1QsV0FBVyxDQUFFLEtBQUssQ0FDbEIsT0FBTyxDQUFFLENBQUMsQ0FDVixVQUFVLENBQUUsT0FBTyxDQUFDLElBQUksQUFBRSxDQUFDLEFBQzNCLDZCQUFjLENBQUMsMkJBQVksT0FBTyxBQUFDLENBQUMsQUFDbEMsT0FBTyxDQUFFLEVBQUUsQ0FDWCxRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsSUFBSSxDQUNULElBQUksQ0FBRSxHQUFHLENBQ1QsV0FBVyxDQUFFLElBQUksQ0FDakIsWUFBWSxDQUFFLEdBQUcsQ0FDakIsWUFBWSxDQUFFLEtBQUssQ0FDbkIsWUFBWSxDQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLFdBQVcsQUFBRSxDQUFDLEFBQzdELDZCQUFjLE1BQU0sQ0FBQyxZQUFZLGVBQUMsQ0FBQyxBQUNqQyxVQUFVLENBQUUsT0FBTyxDQUNuQixPQUFPLENBQUUsQ0FBQyxBQUFFLENBQUMsQUFFakIsMkJBQTJCLDhCQUFDLENBQUMsQUFDM0IsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLE9BQU8sQ0FBRSxZQUFZLENBQ3JCLElBQUksQ0FBRSxJQUFJLENBQ1YsTUFBTSxDQUFFLElBQUksQ0FDWixZQUFZLENBQUUsR0FBRyxDQUNqQixRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsR0FBRyxBQUFFLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i].id;
    	child_ctx[11] = list[i].name;
    	child_ctx[12] = list[i].current;
    	child_ctx[13] = list[i].dev;
    	child_ctx[14] = list[i].data;
    	return child_ctx;
    }

    // (215:4) {:else}
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
    			td1.textContent = "Version";
    			t5 = space();
    			td2 = element("td");
    			td2.textContent = "env";
    			t7 = space();
    			td3 = element("td");
    			td3.textContent = "Info";
    			t9 = space();
    			tbody = element("tbody");
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "projectTable__title svelte-12g4ez4");
    			add_location(h1, file$2, 216, 8, 5968);
    			attr_dev(td0, "class", "svelte-12g4ez4");
    			add_location(td0, file$2, 220, 14, 6092);
    			attr_dev(td1, "class", "svelte-12g4ez4");
    			add_location(td1, file$2, 221, 14, 6123);
    			attr_dev(td2, "class", "svelte-12g4ez4");
    			add_location(td2, file$2, 222, 14, 6154);
    			attr_dev(td3, "class", "svelte-12g4ez4");
    			add_location(td3, file$2, 223, 14, 6181);
    			attr_dev(tr, "class", "svelte-12g4ez4");
    			add_location(tr, file$2, 219, 12, 6073);
    			add_location(thead, file$2, 218, 10, 6053);
    			add_location(tbody, file$2, 226, 10, 6242);
    			attr_dev(table, "class", "svelte-12g4ez4");
    			add_location(table, file$2, 217, 8, 6035);
    			attr_dev(section, "class", "projectTable svelte-12g4ez4");
    			add_location(section, file$2, 215, 6, 5929);
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
    			append_dev(table, t9);
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
    		source: "(215:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (183:4) {#if !currentProject}
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
    			attr_dev(img, "class", "svelte-12g4ez4");
    			add_location(img, file$2, 184, 8, 4818);
    			add_location(h1, file$2, 185, 8, 4876);
    			attr_dev(button, "class", "svelte-12g4ez4");
    			add_location(button, file$2, 186, 8, 4917);
    			attr_dev(section, "class", "empty svelte-12g4ez4");
    			add_location(section, file$2, 183, 6, 4786);
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
    		source: "(183:4) {#if !currentProject}",
    		ctx
    	});

    	return block;
    }

    // (228:12) {#if packages}
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
    		source: "(228:12) {#if packages}",
    		ctx
    	});

    	return block;
    }

    // (244:20) {:else}
    function create_else_block_2(ctx) {
    	let t0;
    	let t1_value = /*data*/ ctx[14].collected.metadata.version + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text("(Latest ");
    			t1 = text(t1_value);
    			t2 = text(")");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*packages*/ 2 && t1_value !== (t1_value = /*data*/ ctx[14].collected.metadata.version + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(244:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (236:91) 
    function create_if_block_5(ctx) {
    	let svg;
    	let path;
    	let polyline;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			polyline = svg_element("polyline");
    			attr_dev(path, "d", "M22 11.08V12a10 10 0 1 1-5.93-9.14");
    			add_location(path, file$2, 240, 24, 6859);
    			attr_dev(polyline, "points", "22 4 12 14.01 9 11.01");
    			add_location(polyline, file$2, 241, 24, 6931);
    			attr_dev(svg, "class", "projectTable__versionCheck svelte-12g4ez4");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$2, 236, 22, 6667);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    			append_dev(svg, polyline);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(236:91) ",
    		ctx
    	});

    	return block;
    }

    // (234:20) {#if !data}
    function create_if_block_4(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", "skeleton svelte-12g4ez4");
    			add_location(span, file$2, 234, 22, 6527);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(234:20) {#if !data}",
    		ctx
    	});

    	return block;
    }

    // (247:20) {#if dev}
    function create_if_block_3$1(ctx) {
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
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(247:20) {#if dev}",
    		ctx
    	});

    	return block;
    }

    // (252:20) {:else}
    function create_else_block_1(ctx) {
    	let a0;
    	let svg0;
    	let path0;
    	let t0;
    	let span0;
    	let a0_href_value;
    	let t2;
    	let a1;
    	let svg1;
    	let path1;
    	let t3;
    	let span1;
    	let a1_href_value;
    	let t5;
    	let a2;
    	let svg2;
    	let path2;
    	let t6;
    	let span2;
    	let a2_href_value;
    	let t8;
    	let a3;
    	let svg3;
    	let g1;
    	let g0;
    	let path3;
    	let t9;
    	let span3;
    	let a3_href_value;

    	const block = {
    		c: function create() {
    			a0 = element("a");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "Issue";
    			t2 = space();
    			a1 = element("a");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t3 = space();
    			span1 = element("span");
    			span1.textContent = "Home Page";
    			t5 = space();
    			a2 = element("a");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t6 = space();
    			span2 = element("span");
    			span2.textContent = "Npm";
    			t8 = space();
    			a3 = element("a");
    			svg3 = svg_element("svg");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			path3 = svg_element("path");
    			t9 = space();
    			span3 = element("span");
    			span3.textContent = "Repository";
    			attr_dev(path0, "d", "M1608 897q65 2 122 27.5t99 68.5 66.5 100.5T1920\n                            1216v192h-128v-192q0-32-10.5-61.5t-29-54-44.5-42-57-26.5q6\n                            29 9.5 59.5t3.5 60.5v256q0 7-1 13t-2 13l6-6q60 60 92\n                            138t32 163-32 162.5-92 137.5l-90-90q42-42\n                            64-95.5t22-113.5q0-68-31-132-31 100-90.5 183T1402\n                            1923t-176.5 92-201.5\n                            33-201.5-33-176.5-92-139.5-142-90.5-183q-31 64-31\n                            132 0 60 22 113.5t64 95.5l-90\n                            90q-60-60-92.5-137.5T256 1729t32.5-163 92.5-138l6\n                            6q-1-7-2-13t-1-13v-256q0-30 3.5-60.5t9.5-59.5q-31\n                            9-57 26.5t-44.5 42-29 54T256 1216v192H128v-192q0-65\n                            24.5-122.5T219 993t99-68.5T440 897q31-70\n                            80-135-57-10-105.5-38.5T331 653t-55-94.5T256\n                            448V256h128v192q0 40 15 75t41 61 61 41 75\n                            15h64v3q47-35 96-59-15-32-23.5-66.5T704 448q0-70\n                            31-135L595 173l90-90 127 127q45-39 98.5-60.5T1024\n                            128t113.5 21.5T1236 210l127-127 90 90-140 140q31 65\n                            31 135 0 35-8.5 69.5T1312 584q26 13 49.5 27.5T1408\n                            643v-3h64q40 0 75-15t61-41 41-61 15-75V256h128v192q0\n                            58-20 110.5t-55 94.5-83.5 70.5T1528 762q49 65 80\n                            135zm-584-641q-40 0-75 15t-61 41-41 61-15 75q0 50 24\n                            90 42-11 83.5-17.5t84.5-6.5 84.5 6.5T1192 538q24-40\n                            24-90 0-40-15-75t-41-61-61-41-75-15zm512\n                            896q0-104-41-197t-110.5-163T1222 681t-198-41-198\n                            41-162.5 111T553 955t-41 197v256q0 106 40.5 199t110\n                            162.5 162.5 110 199 40.5 199-40.5 162.5-110\n                            110-162.5 40.5-199v-256z");
    			add_location(path0, file$2, 259, 26, 7662);
    			attr_dev(svg0, "viewBox", "0 0 2048 2048");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg0, file$2, 256, 24, 7519);
    			attr_dev(span0, "class", "tooltiptext svelte-12g4ez4");
    			add_location(span0, file$2, 288, 24, 9739);
    			attr_dev(a0, "class", "projectAction svelte-12g4ez4");
    			attr_dev(a0, "href", a0_href_value = /*data*/ ctx[14].collected.metadata.links.bugs);
    			attr_dev(a0, "title", "Issue");
    			add_location(a0, file$2, 252, 22, 7341);
    			attr_dev(path1, "d", "M 16 2.59375 L 15.28125 3.28125 L 2.28125\n                            16.28125 L 3.71875 17.71875 L 5 16.4375 L 5 28 L 14\n                            28 L 14 18 L 18 18 L 18 28 L 27 28 L 27 16.4375 L\n                            28.28125 17.71875 L 29.71875 16.28125 L 16.71875\n                            3.28125 Z M 16 5.4375 L 25 14.4375 L 25 26 L 20 26 L\n                            20 16 L 12 16 L 12 26 L 7 26 L 7 14.4375 Z");
    			add_location(path1, file$2, 297, 26, 10152);
    			attr_dev(svg1, "viewBox", "0 0 32 32");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg1, file$2, 294, 24, 10013);
    			attr_dev(span1, "class", "tooltiptext svelte-12g4ez4");
    			add_location(span1, file$2, 305, 24, 10677);
    			attr_dev(a1, "class", "projectAction svelte-12g4ez4");
    			attr_dev(a1, "href", a1_href_value = /*data*/ ctx[14].collected.metadata.links.homepage);
    			attr_dev(a1, "title", "Home Page");
    			add_location(a1, file$2, 290, 22, 9827);
    			attr_dev(path2, "d", "M 0 10 L 0 21 L 9 21 L 9 23 L 16 23 L 16 21 L 32\n                            21 L 32 10 L 0 10 z M 1.7773438 11.777344 L\n                            8.8886719 11.777344 L 8.890625 11.777344 L 8.890625\n                            19.445312 L 7.1113281 19.445312 L 7.1113281\n                            13.556641 L 5.3339844 13.556641 L 5.3339844\n                            19.445312 L 1.7773438 19.445312 L 1.7773438\n                            11.777344 z M 10.667969 11.777344 L 17.777344\n                            11.777344 L 17.779297 11.777344 L 17.779297\n                            19.443359 L 14.222656 19.443359 L 14.222656\n                            21.222656 L 10.667969 21.222656 L 10.667969\n                            11.777344 z M 19.556641 11.777344 L 30.222656\n                            11.777344 L 30.224609 11.777344 L 30.224609\n                            19.445312 L 28.445312 19.445312 L 28.445312\n                            13.556641 L 26.667969 13.556641 L 26.667969\n                            19.445312 L 24.890625 19.445312 L 24.890625\n                            13.556641 L 23.111328 13.556641 L 23.111328\n                            19.445312 L 19.556641 19.445312 L 19.556641\n                            11.777344 z M 14.222656 13.556641 L 14.222656\n                            17.667969 L 16 17.667969 L 16 13.556641 L 14.222656\n                            13.556641 z");
    			add_location(path2, file$2, 314, 26, 11083);
    			attr_dev(svg2, "viewBox", "0 0 32 32");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg2, file$2, 311, 24, 10944);
    			attr_dev(span2, "class", "tooltiptext svelte-12g4ez4");
    			add_location(span2, file$2, 336, 24, 12586);
    			attr_dev(a2, "class", "projectAction svelte-12g4ez4");
    			attr_dev(a2, "href", a2_href_value = /*data*/ ctx[14].collected.metadata.links.npm);
    			attr_dev(a2, "title", "Npm");
    			add_location(a2, file$2, 307, 22, 10769);
    			attr_dev(path3, "d", "M723.9985,560 C710.746,560 700,570.787092\n                                700,584.096644 C700,594.740671 706.876,603.77183\n                                716.4145,606.958412 C717.6145,607.179786\n                                718.0525,606.435849 718.0525,605.797328\n                                C718.0525,605.225068 718.0315,603.710086\n                                718.0195,601.699648 C711.343,603.155898\n                                709.9345,598.469394 709.9345,598.469394\n                                C708.844,595.686405 707.2705,594.94548\n                                707.2705,594.94548 C705.091,593.450075\n                                707.4355,593.480194 707.4355,593.480194\n                                C709.843,593.650366 711.1105,595.963499\n                                711.1105,595.963499 C713.2525,599.645538\n                                716.728,598.58234 718.096,597.964902\n                                C718.3135,596.407754 718.9345,595.346062\n                                719.62,594.743683 C714.2905,594.135281\n                                708.688,592.069123 708.688,582.836167\n                                C708.688,580.205279 709.6225,578.054788\n                                711.1585,576.369634 C710.911,575.759726\n                                710.0875,573.311058 711.3925,569.993458\n                                C711.3925,569.993458 713.4085,569.345902\n                                717.9925,572.46321 C719.908,571.928599\n                                721.96,571.662047 724.0015,571.651505\n                                C726.04,571.662047 728.0935,571.928599\n                                730.0105,572.46321 C734.5915,569.345902\n                                736.603,569.993458 736.603,569.993458\n                                C737.9125,573.311058 737.089,575.759726\n                                736.8415,576.369634 C738.3805,578.054788\n                                739.309,580.205279 739.309,582.836167\n                                C739.309,592.091712 733.6975,594.129257\n                                728.3515,594.725612 C729.2125,595.469549\n                                729.9805,596.939353 729.9805,599.18773\n                                C729.9805,602.408949 729.9505,605.006706\n                                729.9505,605.797328 C729.9505,606.441873\n                                730.3825,607.191834 731.6005,606.9554\n                                C741.13,603.762794 748,594.737659 748,584.096644\n                                C748,570.787092 737.254,560 723.9985,560");
    			add_location(path3, file$2, 353, 30, 13359);
    			attr_dev(g0, "fill", "#000");
    			attr_dev(g0, "transform", "translate(-700.000000, -560.000000)");
    			add_location(g0, file$2, 350, 28, 13205);
    			attr_dev(g1, "fill", "none");
    			attr_dev(g1, "fillrule", "evenodd");
    			attr_dev(g1, "stroke", "none");
    			attr_dev(g1, "strokewidth", "1");
    			add_location(g1, file$2, 345, 26, 13000);
    			attr_dev(svg3, "viewBox", "0 0 48 47");
    			attr_dev(svg3, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg3, file$2, 342, 24, 12861);
    			attr_dev(span3, "class", "tooltiptext svelte-12g4ez4");
    			add_location(span3, file$2, 393, 24, 16094);
    			attr_dev(a3, "class", "projectAction svelte-12g4ez4");
    			attr_dev(a3, "href", a3_href_value = /*data*/ ctx[14].collected.metadata.links.repository);
    			attr_dev(a3, "title", "Repository");
    			add_location(a3, file$2, 338, 22, 12672);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a0, anchor);
    			append_dev(a0, svg0);
    			append_dev(svg0, path0);
    			append_dev(a0, t0);
    			append_dev(a0, span0);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, a1, anchor);
    			append_dev(a1, svg1);
    			append_dev(svg1, path1);
    			append_dev(a1, t3);
    			append_dev(a1, span1);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, a2, anchor);
    			append_dev(a2, svg2);
    			append_dev(svg2, path2);
    			append_dev(a2, t6);
    			append_dev(a2, span2);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, a3, anchor);
    			append_dev(a3, svg3);
    			append_dev(svg3, g1);
    			append_dev(g1, g0);
    			append_dev(g0, path3);
    			append_dev(a3, t9);
    			append_dev(a3, span3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*packages*/ 2 && a0_href_value !== (a0_href_value = /*data*/ ctx[14].collected.metadata.links.bugs)) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (dirty & /*packages*/ 2 && a1_href_value !== (a1_href_value = /*data*/ ctx[14].collected.metadata.links.homepage)) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if (dirty & /*packages*/ 2 && a2_href_value !== (a2_href_value = /*data*/ ctx[14].collected.metadata.links.npm)) {
    				attr_dev(a2, "href", a2_href_value);
    			}

    			if (dirty & /*packages*/ 2 && a3_href_value !== (a3_href_value = /*data*/ ctx[14].collected.metadata.links.repository)) {
    				attr_dev(a3, "href", a3_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(a1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(a2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(a3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(252:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (250:20) {#if !data}
    function create_if_block_2$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", "skeleton svelte-12g4ez4");
    			add_location(span, file$2, 250, 22, 7265);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(250:20) {#if !data}",
    		ctx
    	});

    	return block;
    }

    // (229:14) {#each packages as { id, name, current, dev, data }}
    function create_each_block$1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*name*/ ctx[11] + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*current*/ ctx[12] + "";
    	let t2;
    	let t3;
    	let show_if;
    	let t4;
    	let td2;
    	let t5;
    	let td3;
    	let t6;
    	let tr_id_value;

    	function select_block_type_1(ctx, dirty) {
    		if (!/*data*/ ctx[14]) return create_if_block_4;
    		if (show_if == null || dirty & /*packages*/ 2) show_if = !!(/*current*/ ctx[12].replace("^", "") === /*data*/ ctx[14].collected.metadata.version);
    		if (show_if) return create_if_block_5;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_1(ctx, -1);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*dev*/ ctx[13] && create_if_block_3$1(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (!/*data*/ ctx[14]) return create_if_block_2$1;
    		return create_else_block_1;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block2 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			if_block0.c();
    			t4 = space();
    			td2 = element("td");
    			if (if_block1) if_block1.c();
    			t5 = space();
    			td3 = element("td");
    			if_block2.c();
    			t6 = space();
    			attr_dev(td0, "class", "svelte-12g4ez4");
    			add_location(td0, file$2, 230, 18, 6404);
    			attr_dev(td1, "class", "svelte-12g4ez4");
    			add_location(td1, file$2, 231, 18, 6438);
    			attr_dev(td2, "class", "svelte-12g4ez4");
    			add_location(td2, file$2, 245, 18, 7121);
    			attr_dev(td3, "class", "svelte-12g4ez4");
    			add_location(td3, file$2, 248, 18, 7206);
    			attr_dev(tr, "id", tr_id_value = `package_${/*id*/ ctx[10]}`);
    			attr_dev(tr, "class", "svelte-12g4ez4");
    			add_location(tr, file$2, 229, 16, 6360);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(td1, t3);
    			if_block0.m(td1, null);
    			append_dev(tr, t4);
    			append_dev(tr, td2);
    			if (if_block1) if_block1.m(td2, null);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			if_block2.m(td3, null);
    			append_dev(tr, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*packages*/ 2 && t0_value !== (t0_value = /*name*/ ctx[11] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*packages*/ 2 && t2_value !== (t2_value = /*current*/ ctx[12] + "")) set_data_dev(t2, t2_value);

    			if (current_block_type === (current_block_type = select_block_type_1(ctx, dirty)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(td1, null);
    				}
    			}

    			if (/*dev*/ ctx[13]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_3$1(ctx);
    					if_block1.c();
    					if_block1.m(td2, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_1(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(td3, null);
    				}
    			}

    			if (dirty & /*packages*/ 2 && tr_id_value !== (tr_id_value = `package_${/*id*/ ctx[10]}`)) {
    				attr_dev(tr, "id", tr_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(229:14) {#each packages as { id, name, current, dev, data }}",
    		ctx
    	});

    	return block;
    }

    // (182:2) <SimpleBar maxHeight={'calc(100vh - 20px)'}>
    function create_default_slot$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (!/*currentProject*/ ctx[0]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(182:2) <SimpleBar maxHeight={'calc(100vh - 20px)'}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let simplebar;
    	let current;

    	simplebar = new SimpleBar_1({
    			props: {
    				maxHeight: "calc(100vh - 20px)",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(simplebar.$$.fragment);
    			attr_dev(div, "class", "content svelte-12g4ez4");
    			add_location(div, file$2, 180, 0, 4685);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(simplebar, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const simplebar_changes = {};

    			if (dirty & /*$$scope, $projects, currentProject, packages*/ 131079) {
    				simplebar_changes.$$scope = { dirty, ctx };
    			}

    			simplebar.$set(simplebar_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(simplebar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(simplebar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(simplebar);
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
    	let $projects;
    	validate_store(projects, "projects");
    	component_subscribe($$self, projects, $$value => $$invalidate(2, $projects = $$value));
    	let currentProjectID = false;
    	let currentProject = {};
    	let project = {};
    	let packages = [];
    	let packagesPost = [];
    	let newData = [];
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
    			$$invalidate(1, packages = []);
    			packagesPost = [];
    			newData = [];
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

    			for await (let pack of packages) {
    				packagesPost = [...packagesPost, pack.name];
    			}

    			await getPackagesInfo(packagesPost).then(async res => {
    				// const dataInfo = Object.entries(res.data);
    				for await (let item of packages) {
    					newData = [...newData, { ...item, data: res.data[item.name] }];
    				}
    			});

    			$$invalidate(1, packages = newData);
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
    		SimpleBar: SimpleBar_1,
    		projects,
    		menuActive,
    		getPackagesInfo,
    		openDirectory,
    		getProjectPackages,
    		currentProjectID,
    		currentProject,
    		project,
    		packages,
    		packagesPost,
    		newData,
    		dependencies,
    		devDependencies,
    		$projects
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentProjectID" in $$props) currentProjectID = $$props.currentProjectID;
    		if ("currentProject" in $$props) $$invalidate(0, currentProject = $$props.currentProject);
    		if ("project" in $$props) project = $$props.project;
    		if ("packages" in $$props) $$invalidate(1, packages = $$props.packages);
    		if ("packagesPost" in $$props) packagesPost = $$props.packagesPost;
    		if ("newData" in $$props) newData = $$props.newData;
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
    		if (!document.getElementById("svelte-12g4ez4-style")) add_css$2();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.1 */
    const file$3 = "src/App.svelte";

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-1bxe7rb-style";
    	style.textContent = ".main.svelte-1bxe7rb{min-height:100vh;height:100%;display:flex;overflow:hidden;flex-direction:row;align-items:stretch}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuICBpbXBvcnQgU2lkZWJhciBmcm9tIFwiLi9jb21wb25lbnRzL3NpZGViYXIuc3ZlbHRlXCI7XG4gIGltcG9ydCBNYWluIGZyb20gXCIuL2NvbXBvbmVudHMvbWFpbi5zdmVsdGVcIjtcbjwvc2NyaXB0PlxuXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5tYWluIHtcbiAgbWluLWhlaWdodDogMTAwdmg7XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcbiAgYWxpZ24taXRlbXM6IHN0cmV0Y2g7IH1cbjwvc3R5bGU+XG5cbjxtYWluIGNsYXNzPVwibWFpblwiPlxuICA8U2lkZWJhciAvPlxuICA8TWFpbiAvPlxuPC9tYWluPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUt3QixLQUFLLGVBQUMsQ0FBQyxBQUM3QixVQUFVLENBQUUsS0FBSyxDQUNqQixNQUFNLENBQUUsSUFBSSxDQUNaLE9BQU8sQ0FBRSxJQUFJLENBQ2IsUUFBUSxDQUFFLE1BQU0sQ0FDaEIsY0FBYyxDQUFFLEdBQUcsQ0FDbkIsV0FBVyxDQUFFLE9BQU8sQUFBRSxDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    function create_fragment$3(ctx) {
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
    			attr_dev(main1, "class", "main svelte-1bxe7rb");
    			add_location(main1, file$3, 14, 0, 285);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-1bxe7rb-style")) add_css$3();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
