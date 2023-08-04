
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop$1() {}

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	function subscribe(store, ...callbacks) {
		if (store == null) {
			for (const callback of callbacks) {
				callback(undefined);
			}
			return noop$1;
		}
		const unsub = store.subscribe(...callbacks);
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/** @returns {void} */
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
		return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
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

	/** @returns {void} */
	function update_slot_base(
		slot,
		slot_definition,
		ctx,
		$$scope,
		slot_changes,
		get_slot_context_fn
	) {
		if (slot_changes) {
			const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
			slot.p(slot_context, slot_changes);
		}
	}

	/** @returns {any[] | -1} */
	function get_all_dirty_from_scope($$scope) {
		if ($$scope.ctx.length > 32) {
			const dirty = [];
			const length = $$scope.ctx.length / 32;
			for (let i = 0; i < length; i++) {
				dirty[i] = -1;
			}
			return dirty;
		}
		return -1;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @template {keyof SVGElementTagNameMap} K
	 * @param {K} name
	 * @returns {SVGElement}
	 */
	function svg_element(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data(text, data) {
		data = '' + data;
		if (text.data === data) return;
		text.data = /** @type {string} */ (data);
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, important ? 'important' : '');
		}
	}

	/**
	 * @returns {void} */
	function toggle_class(element, name, toggle) {
		// The `!!` is required because an `undefined` flag means flipping the current state.
		element.classList.toggle(name, !!toggle);
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
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
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
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

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	/** @returns {void} */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop$1,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
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
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop$1;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop$1;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	const PUBLIC_VERSION = '4';

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var canUseDOM = !!(
	  typeof window !== 'undefined' &&
	  window.document &&
	  window.document.createElement
	);

	var canUseDom = canUseDOM;

	var canUseDOM$1 = /*@__PURE__*/getDefaultExportFromCjs(canUseDom);

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

	var freeGlobal$1 = freeGlobal;

	/** Detect free variable `self`. */
	var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root = freeGlobal$1 || freeSelf || Function('return this')();

	var root$1 = root;

	/** Built-in value references. */
	var Symbol$1 = root$1.Symbol;

	var Symbol$2 = Symbol$1;

	/** Used for built-in method references. */
	var objectProto$1 = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var nativeObjectToString$1 = objectProto$1.toString;

	/** Built-in value references. */
	var symToStringTag$1 = Symbol$2 ? Symbol$2.toStringTag : undefined;

	/**
	 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @returns {string} Returns the raw `toStringTag`.
	 */
	function getRawTag(value) {
	  var isOwn = hasOwnProperty$1.call(value, symToStringTag$1),
	      tag = value[symToStringTag$1];

	  try {
	    value[symToStringTag$1] = undefined;
	    var unmasked = true;
	  } catch (e) {}

	  var result = nativeObjectToString$1.call(value);
	  if (unmasked) {
	    if (isOwn) {
	      value[symToStringTag$1] = tag;
	    } else {
	      delete value[symToStringTag$1];
	    }
	  }
	  return result;
	}

	/** Used for built-in method references. */
	var objectProto = Object.prototype;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var nativeObjectToString = objectProto.toString;

	/**
	 * Converts `value` to a string using `Object.prototype.toString`.
	 *
	 * @private
	 * @param {*} value The value to convert.
	 * @returns {string} Returns the converted string.
	 */
	function objectToString(value) {
	  return nativeObjectToString.call(value);
	}

	/** `Object#toString` result references. */
	var nullTag = '[object Null]',
	    undefinedTag = '[object Undefined]';

	/** Built-in value references. */
	var symToStringTag = Symbol$2 ? Symbol$2.toStringTag : undefined;

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
	  return (symToStringTag && symToStringTag in Object(value))
	    ? getRawTag(value)
	    : objectToString(value);
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

	/** Used to match a single whitespace character. */
	var reWhitespace = /\s/;

	/**
	 * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
	 * character of `string`.
	 *
	 * @private
	 * @param {string} string The string to inspect.
	 * @returns {number} Returns the index of the last non-whitespace character.
	 */
	function trimmedEndIndex(string) {
	  var index = string.length;

	  while (index-- && reWhitespace.test(string.charAt(index))) {}
	  return index;
	}

	/** Used to match leading whitespace. */
	var reTrimStart = /^\s+/;

	/**
	 * The base implementation of `_.trim`.
	 *
	 * @private
	 * @param {string} string The string to trim.
	 * @returns {string} Returns the trimmed string.
	 */
	function baseTrim(string) {
	  return string
	    ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, '')
	    : string;
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
	  value = baseTrim(value);
	  var isBinary = reIsBinary.test(value);
	  return (isBinary || reIsOctal.test(value))
	    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
	    : (reIsBadHex.test(value) ? NAN : +value);
	}

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
	  return root$1.Date.now();
	};

	var now$1 = now;

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
	    var time = now$1();
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
	    return timerId === undefined ? result : trailingEdge(now$1());
	  }

	  function debounced() {
	    var time = now$1(),
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
	var FUNC_ERROR_TEXT = 'Expected a function';

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
	    throw new TypeError(FUNC_ERROR_TEXT);
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
	 * simplebar-core - v1.2.4
	 * Scrollbars, simpler.
	 * https://grsmto.github.io/simplebar/
	 *
	 * Made by Adrien Denat from a fork by Jonathan Nicol
	 * Under MIT License
	 */


	/******************************************************************************
	Copyright (c) Microsoft Corporation.

	Permission to use, copy, modify, and/or distribute this software for any
	purpose with or without fee is hereby granted.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
	REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
	AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
	INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
	OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
	PERFORMANCE OF THIS SOFTWARE.
	***************************************************************************** */

	var __assign = function() {
	    __assign = Object.assign || function __assign(t) {
	        for (var s, i = 1, n = arguments.length; i < n; i++) {
	            s = arguments[i];
	            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
	        }
	        return t;
	    };
	    return __assign.apply(this, arguments);
	};

	var cachedScrollbarWidth = null;
	var cachedDevicePixelRatio = null;
	if (canUseDOM$1) {
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

	function getElementWindow$1(element) {
	    if (!element ||
	        !element.ownerDocument ||
	        !element.ownerDocument.defaultView) {
	        return window;
	    }
	    return element.ownerDocument.defaultView;
	}
	function getElementDocument$1(element) {
	    if (!element || !element.ownerDocument) {
	        return document;
	    }
	    return element.ownerDocument;
	}
	// Helper function to retrieve options from element attributes
	var getOptions$1 = function (obj) {
	    var initialObj = {};
	    var options = Array.prototype.reduce.call(obj, function (acc, attribute) {
	        var option = attribute.name.match(/data-simplebar-(.+)/);
	        if (option) {
	            var key = option[1].replace(/\W+(.)/g, function (_, chr) { return chr.toUpperCase(); });
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
	    }, initialObj);
	    return options;
	};
	function addClasses$1(el, classes) {
	    var _a;
	    if (!el)
	        return;
	    (_a = el.classList).add.apply(_a, classes.split(' '));
	}
	function removeClasses$1(el, classes) {
	    if (!el)
	        return;
	    classes.split(' ').forEach(function (className) {
	        el.classList.remove(className);
	    });
	}
	function classNamesToQuery$1(classNames) {
	    return ".".concat(classNames.split(' ').join('.'));
	}

	var helpers = /*#__PURE__*/Object.freeze({
	    __proto__: null,
	    getElementWindow: getElementWindow$1,
	    getElementDocument: getElementDocument$1,
	    getOptions: getOptions$1,
	    addClasses: addClasses$1,
	    removeClasses: removeClasses$1,
	    classNamesToQuery: classNamesToQuery$1
	});

	var getElementWindow = getElementWindow$1, getElementDocument = getElementDocument$1, getOptions$2 = getOptions$1, addClasses$2 = addClasses$1, removeClasses = removeClasses$1, classNamesToQuery = classNamesToQuery$1;
	var SimpleBarCore = /** @class */ (function () {
	    function SimpleBarCore(element, options) {
	        if (options === void 0) { options = {}; }
	        var _this = this;
	        this.removePreventClickId = null;
	        this.minScrollbarWidth = 20;
	        this.stopScrollDelay = 175;
	        this.isScrolling = false;
	        this.isMouseEntering = false;
	        this.scrollXTicking = false;
	        this.scrollYTicking = false;
	        this.wrapperEl = null;
	        this.contentWrapperEl = null;
	        this.contentEl = null;
	        this.offsetEl = null;
	        this.maskEl = null;
	        this.placeholderEl = null;
	        this.heightAutoObserverWrapperEl = null;
	        this.heightAutoObserverEl = null;
	        this.rtlHelpers = null;
	        this.scrollbarWidth = 0;
	        this.resizeObserver = null;
	        this.mutationObserver = null;
	        this.elStyles = null;
	        this.isRtl = null;
	        this.mouseX = 0;
	        this.mouseY = 0;
	        this.onMouseMove = function () { };
	        this.onWindowResize = function () { };
	        this.onStopScrolling = function () { };
	        this.onMouseEntered = function () { };
	        /**
	         * On scroll event handling
	         */
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
	                addClasses$2(_this.el, _this.classNames.scrolling);
	            }
	            _this.showScrollbar('x');
	            _this.showScrollbar('y');
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
	        this._onStopScrolling = function () {
	            removeClasses(_this.el, _this.classNames.scrolling);
	            if (_this.options.autoHide) {
	                _this.hideScrollbar('x');
	                _this.hideScrollbar('y');
	            }
	            _this.isScrolling = false;
	        };
	        this.onMouseEnter = function () {
	            if (!_this.isMouseEntering) {
	                addClasses$2(_this.el, _this.classNames.mouseEntered);
	                _this.showScrollbar('x');
	                _this.showScrollbar('y');
	                _this.isMouseEntering = true;
	            }
	            _this.onMouseEntered();
	        };
	        this._onMouseEntered = function () {
	            removeClasses(_this.el, _this.classNames.mouseEntered);
	            if (_this.options.autoHide) {
	                _this.hideScrollbar('x');
	                _this.hideScrollbar('y');
	            }
	            _this.isMouseEntering = false;
	        };
	        this._onMouseMove = function (e) {
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
	        this._onWindowResize = function () {
	            // Recalculate scrollbarWidth in case it's a zoom
	            _this.scrollbarWidth = _this.getScrollbarWidth();
	            _this.hideNativeScrollbar();
	        };
	        this.onPointerEvent = function (e) {
	            if (!_this.axis.x.track.el ||
	                !_this.axis.y.track.el ||
	                !_this.axis.x.scrollbar.el ||
	                !_this.axis.y.scrollbar.el)
	                return;
	            var isWithinTrackXBounds, isWithinTrackYBounds;
	            _this.axis.x.track.rect = _this.axis.x.track.el.getBoundingClientRect();
	            _this.axis.y.track.rect = _this.axis.y.track.el.getBoundingClientRect();
	            if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
	                isWithinTrackXBounds = _this.isWithinBounds(_this.axis.x.track.rect);
	            }
	            if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
	                isWithinTrackYBounds = _this.isWithinBounds(_this.axis.y.track.rect);
	            }
	            // If any pointer event is called on the scrollbar
	            if (isWithinTrackXBounds || isWithinTrackYBounds) {
	                // Prevent event leaking
	                e.stopPropagation();
	                if (e.type === 'pointerdown' && e.pointerType !== 'touch') {
	                    if (isWithinTrackXBounds) {
	                        _this.axis.x.scrollbar.rect =
	                            _this.axis.x.scrollbar.el.getBoundingClientRect();
	                        if (_this.isWithinBounds(_this.axis.x.scrollbar.rect)) {
	                            _this.onDragStart(e, 'x');
	                        }
	                        else {
	                            _this.onTrackClick(e, 'x');
	                        }
	                    }
	                    if (isWithinTrackYBounds) {
	                        _this.axis.y.scrollbar.rect =
	                            _this.axis.y.scrollbar.el.getBoundingClientRect();
	                        if (_this.isWithinBounds(_this.axis.y.scrollbar.rect)) {
	                            _this.onDragStart(e, 'y');
	                        }
	                        else {
	                            _this.onTrackClick(e, 'y');
	                        }
	                    }
	                }
	            }
	        };
	        /**
	         * Drag scrollbar handle
	         */
	        this.drag = function (e) {
	            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
	            if (!_this.draggedAxis || !_this.contentWrapperEl)
	                return;
	            var eventOffset;
	            var track = _this.axis[_this.draggedAxis].track;
	            var trackSize = (_b = (_a = track.rect) === null || _a === void 0 ? void 0 : _a[_this.axis[_this.draggedAxis].sizeAttr]) !== null && _b !== void 0 ? _b : 0;
	            var scrollbar = _this.axis[_this.draggedAxis].scrollbar;
	            var contentSize = (_d = (_c = _this.contentWrapperEl) === null || _c === void 0 ? void 0 : _c[_this.axis[_this.draggedAxis].scrollSizeAttr]) !== null && _d !== void 0 ? _d : 0;
	            var hostSize = parseInt((_f = (_e = _this.elStyles) === null || _e === void 0 ? void 0 : _e[_this.axis[_this.draggedAxis].sizeAttr]) !== null && _f !== void 0 ? _f : '0px', 10);
	            e.preventDefault();
	            e.stopPropagation();
	            if (_this.draggedAxis === 'y') {
	                eventOffset = e.pageY;
	            }
	            else {
	                eventOffset = e.pageX;
	            }
	            // Calculate how far the user's mouse is from the top/left of the scrollbar (minus the dragOffset).
	            var dragPos = eventOffset -
	                ((_h = (_g = track.rect) === null || _g === void 0 ? void 0 : _g[_this.axis[_this.draggedAxis].offsetAttr]) !== null && _h !== void 0 ? _h : 0) -
	                _this.axis[_this.draggedAxis].dragOffset;
	            dragPos = _this.draggedAxis === 'x' && _this.isRtl
	                ? ((_k = (_j = track.rect) === null || _j === void 0 ? void 0 : _j[_this.axis[_this.draggedAxis].sizeAttr]) !== null && _k !== void 0 ? _k : 0) -
	                    scrollbar.size -
	                    dragPos
	                : dragPos;
	            // Convert the mouse position into a percentage of the scrollbar height/width.
	            var dragPerc = dragPos / (trackSize - scrollbar.size);
	            // Scroll the content by the same percentage.
	            var scrollPos = dragPerc * (contentSize - hostSize);
	            // Fix browsers inconsistency on RTL
	            if (_this.draggedAxis === 'x' && _this.isRtl) {
	                scrollPos = ((_l = SimpleBarCore.getRtlHelpers()) === null || _l === void 0 ? void 0 : _l.isScrollingToNegative)
	                    ? -scrollPos
	                    : scrollPos;
	            }
	            _this.contentWrapperEl[_this.axis[_this.draggedAxis].scrollOffsetAttr] =
	                scrollPos;
	        };
	        /**
	         * End scroll handle drag
	         */
	        this.onEndDrag = function (e) {
	            var elDocument = getElementDocument(_this.el);
	            var elWindow = getElementWindow(_this.el);
	            e.preventDefault();
	            e.stopPropagation();
	            removeClasses(_this.el, _this.classNames.dragging);
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
	        /**
	         * Handler to ignore click events during drag
	         */
	        this.preventClick = function (e) {
	            e.preventDefault();
	            e.stopPropagation();
	        };
	        this.el = element;
	        this.options = __assign(__assign({}, SimpleBarCore.defaultOptions), options);
	        this.classNames = __assign(__assign({}, SimpleBarCore.defaultOptions.classNames), options.classNames);
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
	                forceVisible: false,
	                track: { size: null, el: null, rect: null, isVisible: false },
	                scrollbar: { size: null, el: null, rect: null, isVisible: false }
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
	                forceVisible: false,
	                track: { size: null, el: null, rect: null, isVisible: false },
	                scrollbar: { size: null, el: null, rect: null, isVisible: false }
	            }
	        };
	        if (typeof this.el !== 'object' || !this.el.nodeName) {
	            throw new Error("Argument passed to SimpleBar must be an HTML element instead of ".concat(this.el));
	        }
	        this.onMouseMove = throttle(this._onMouseMove, 64);
	        this.onWindowResize = debounce(this._onWindowResize, 64, { leading: true });
	        this.onStopScrolling = debounce(this._onStopScrolling, this.stopScrollDelay);
	        this.onMouseEntered = debounce(this._onMouseEntered, this.stopScrollDelay);
	        this.init();
	    }
	    /**
	     * Helper to fix browsers inconsistency on RTL:
	     *  - Firefox inverts the scrollbar initial position
	     *  - IE11 inverts both scrollbar position and scrolling offset
	     * Directly inspired by @KingSora's OverlayScrollbars https://github.com/KingSora/OverlayScrollbars/blob/master/js/OverlayScrollbars.js#L1634
	     */
	    SimpleBarCore.getRtlHelpers = function () {
	        if (SimpleBarCore.rtlHelpers) {
	            return SimpleBarCore.rtlHelpers;
	        }
	        var dummyDiv = document.createElement('div');
	        dummyDiv.innerHTML =
	            '<div class="simplebar-dummy-scrollbar-size"><div></div></div>';
	        var scrollbarDummyEl = dummyDiv.firstElementChild;
	        var dummyChild = scrollbarDummyEl === null || scrollbarDummyEl === void 0 ? void 0 : scrollbarDummyEl.firstElementChild;
	        if (!dummyChild)
	            return null;
	        document.body.appendChild(scrollbarDummyEl);
	        scrollbarDummyEl.scrollLeft = 0;
	        var dummyContainerOffset = SimpleBarCore.getOffset(scrollbarDummyEl);
	        var dummyChildOffset = SimpleBarCore.getOffset(dummyChild);
	        scrollbarDummyEl.scrollLeft = -999;
	        var dummyChildOffsetAfterScroll = SimpleBarCore.getOffset(dummyChild);
	        document.body.removeChild(scrollbarDummyEl);
	        SimpleBarCore.rtlHelpers = {
	            // determines if the scrolling is responding with negative values
	            isScrollOriginAtZero: dummyContainerOffset.left !== dummyChildOffset.left,
	            // determines if the origin scrollbar position is inverted or not (positioned on left or right)
	            isScrollingToNegative: dummyChildOffset.left !== dummyChildOffsetAfterScroll.left
	        };
	        return SimpleBarCore.rtlHelpers;
	    };
	    SimpleBarCore.prototype.getScrollbarWidth = function () {
	        // Try/catch for FF 56 throwing on undefined computedStyles
	        try {
	            // Detect browsers supporting CSS scrollbar styling and do not calculate
	            if ((this.contentWrapperEl &&
	                getComputedStyle(this.contentWrapperEl, '::-webkit-scrollbar')
	                    .display === 'none') ||
	                'scrollbarWidth' in document.documentElement.style ||
	                '-ms-overflow-style' in document.documentElement.style) {
	                return 0;
	            }
	            else {
	                return scrollbarWidth();
	            }
	        }
	        catch (e) {
	            return scrollbarWidth();
	        }
	    };
	    SimpleBarCore.getOffset = function (el) {
	        var rect = el.getBoundingClientRect();
	        var elDocument = getElementDocument(el);
	        var elWindow = getElementWindow(el);
	        return {
	            top: rect.top +
	                (elWindow.pageYOffset || elDocument.documentElement.scrollTop),
	            left: rect.left +
	                (elWindow.pageXOffset || elDocument.documentElement.scrollLeft)
	        };
	    };
	    SimpleBarCore.prototype.init = function () {
	        // We stop here on server-side
	        if (canUseDOM$1) {
	            this.initDOM();
	            this.rtlHelpers = SimpleBarCore.getRtlHelpers();
	            this.scrollbarWidth = this.getScrollbarWidth();
	            this.recalculate();
	            this.initListeners();
	        }
	    };
	    SimpleBarCore.prototype.initDOM = function () {
	        var _a, _b;
	        // assume that element has his DOM already initiated
	        this.wrapperEl = this.el.querySelector(classNamesToQuery(this.classNames.wrapper));
	        this.contentWrapperEl =
	            this.options.scrollableNode ||
	                this.el.querySelector(classNamesToQuery(this.classNames.contentWrapper));
	        this.contentEl =
	            this.options.contentNode ||
	                this.el.querySelector(classNamesToQuery(this.classNames.contentEl));
	        this.offsetEl = this.el.querySelector(classNamesToQuery(this.classNames.offset));
	        this.maskEl = this.el.querySelector(classNamesToQuery(this.classNames.mask));
	        this.placeholderEl = this.findChild(this.wrapperEl, classNamesToQuery(this.classNames.placeholder));
	        this.heightAutoObserverWrapperEl = this.el.querySelector(classNamesToQuery(this.classNames.heightAutoObserverWrapperEl));
	        this.heightAutoObserverEl = this.el.querySelector(classNamesToQuery(this.classNames.heightAutoObserverEl));
	        this.axis.x.track.el = this.findChild(this.el, "".concat(classNamesToQuery(this.classNames.track)).concat(classNamesToQuery(this.classNames.horizontal)));
	        this.axis.y.track.el = this.findChild(this.el, "".concat(classNamesToQuery(this.classNames.track)).concat(classNamesToQuery(this.classNames.vertical)));
	        this.axis.x.scrollbar.el =
	            ((_a = this.axis.x.track.el) === null || _a === void 0 ? void 0 : _a.querySelector(classNamesToQuery(this.classNames.scrollbar))) || null;
	        this.axis.y.scrollbar.el =
	            ((_b = this.axis.y.track.el) === null || _b === void 0 ? void 0 : _b.querySelector(classNamesToQuery(this.classNames.scrollbar))) || null;
	        if (!this.options.autoHide) {
	            addClasses$2(this.axis.x.scrollbar.el, this.classNames.visible);
	            addClasses$2(this.axis.y.scrollbar.el, this.classNames.visible);
	        }
	    };
	    SimpleBarCore.prototype.initListeners = function () {
	        var _this = this;
	        var _a;
	        var elWindow = getElementWindow(this.el);
	        // Event listeners
	        this.el.addEventListener('mouseenter', this.onMouseEnter);
	        this.el.addEventListener('pointerdown', this.onPointerEvent, true);
	        this.el.addEventListener('mousemove', this.onMouseMove);
	        this.el.addEventListener('mouseleave', this.onMouseLeave);
	        (_a = this.contentWrapperEl) === null || _a === void 0 ? void 0 : _a.addEventListener('scroll', this.onScroll);
	        // Browser zoom triggers a window resize
	        elWindow.addEventListener('resize', this.onWindowResize);
	        if (!this.contentEl)
	            return;
	        if (window.ResizeObserver) {
	            // Hack for https://github.com/WICG/ResizeObserver/issues/38
	            var resizeObserverStarted_1 = false;
	            var resizeObserver = elWindow.ResizeObserver || ResizeObserver;
	            this.resizeObserver = new resizeObserver(function () {
	                if (!resizeObserverStarted_1)
	                    return;
	                elWindow.requestAnimationFrame(function () {
	                    _this.recalculate();
	                });
	            });
	            this.resizeObserver.observe(this.el);
	            this.resizeObserver.observe(this.contentEl);
	            elWindow.requestAnimationFrame(function () {
	                resizeObserverStarted_1 = true;
	            });
	        }
	        // This is required to detect horizontal scroll. Vertical scroll only needs the resizeObserver.
	        this.mutationObserver = new elWindow.MutationObserver(function () {
	            elWindow.requestAnimationFrame(function () {
	                _this.recalculate();
	            });
	        });
	        this.mutationObserver.observe(this.contentEl, {
	            childList: true,
	            subtree: true,
	            characterData: true
	        });
	    };
	    SimpleBarCore.prototype.recalculate = function () {
	        if (!this.heightAutoObserverEl ||
	            !this.contentEl ||
	            !this.contentWrapperEl ||
	            !this.wrapperEl ||
	            !this.placeholderEl)
	            return;
	        var elWindow = getElementWindow(this.el);
	        this.elStyles = elWindow.getComputedStyle(this.el);
	        this.isRtl = this.elStyles.direction === 'rtl';
	        var contentElOffsetWidth = this.contentEl.offsetWidth;
	        var isHeightAuto = this.heightAutoObserverEl.offsetHeight <= 1;
	        var isWidthAuto = this.heightAutoObserverEl.offsetWidth <= 1 || contentElOffsetWidth > 0;
	        var contentWrapperElOffsetWidth = this.contentWrapperEl.offsetWidth;
	        var elOverflowX = this.elStyles.overflowX;
	        var elOverflowY = this.elStyles.overflowY;
	        this.contentEl.style.padding = "".concat(this.elStyles.paddingTop, " ").concat(this.elStyles.paddingRight, " ").concat(this.elStyles.paddingBottom, " ").concat(this.elStyles.paddingLeft);
	        this.wrapperEl.style.margin = "-".concat(this.elStyles.paddingTop, " -").concat(this.elStyles.paddingRight, " -").concat(this.elStyles.paddingBottom, " -").concat(this.elStyles.paddingLeft);
	        var contentElScrollHeight = this.contentEl.scrollHeight;
	        var contentElScrollWidth = this.contentEl.scrollWidth;
	        this.contentWrapperEl.style.height = isHeightAuto ? 'auto' : '100%';
	        // Determine placeholder size
	        this.placeholderEl.style.width = isWidthAuto
	            ? "".concat(contentElOffsetWidth || contentElScrollWidth, "px")
	            : 'auto';
	        this.placeholderEl.style.height = "".concat(contentElScrollHeight, "px");
	        var contentWrapperElOffsetHeight = this.contentWrapperEl.offsetHeight;
	        this.axis.x.isOverflowing =
	            contentElOffsetWidth !== 0 && contentElScrollWidth > contentElOffsetWidth;
	        this.axis.y.isOverflowing =
	            contentElScrollHeight > contentWrapperElOffsetHeight;
	        // Set isOverflowing to false if user explicitely set hidden overflow
	        this.axis.x.isOverflowing =
	            elOverflowX === 'hidden' ? false : this.axis.x.isOverflowing;
	        this.axis.y.isOverflowing =
	            elOverflowY === 'hidden' ? false : this.axis.y.isOverflowing;
	        this.axis.x.forceVisible =
	            this.options.forceVisible === 'x' || this.options.forceVisible === true;
	        this.axis.y.forceVisible =
	            this.options.forceVisible === 'y' || this.options.forceVisible === true;
	        this.hideNativeScrollbar();
	        // Set isOverflowing to false if scrollbar is not necessary (content is shorter than offset)
	        var offsetForXScrollbar = this.axis.x.isOverflowing
	            ? this.scrollbarWidth
	            : 0;
	        var offsetForYScrollbar = this.axis.y.isOverflowing
	            ? this.scrollbarWidth
	            : 0;
	        this.axis.x.isOverflowing =
	            this.axis.x.isOverflowing &&
	                contentElScrollWidth > contentWrapperElOffsetWidth - offsetForYScrollbar;
	        this.axis.y.isOverflowing =
	            this.axis.y.isOverflowing &&
	                contentElScrollHeight >
	                    contentWrapperElOffsetHeight - offsetForXScrollbar;
	        this.axis.x.scrollbar.size = this.getScrollbarSize('x');
	        this.axis.y.scrollbar.size = this.getScrollbarSize('y');
	        if (this.axis.x.scrollbar.el)
	            this.axis.x.scrollbar.el.style.width = "".concat(this.axis.x.scrollbar.size, "px");
	        if (this.axis.y.scrollbar.el)
	            this.axis.y.scrollbar.el.style.height = "".concat(this.axis.y.scrollbar.size, "px");
	        this.positionScrollbar('x');
	        this.positionScrollbar('y');
	        this.toggleTrackVisibility('x');
	        this.toggleTrackVisibility('y');
	    };
	    /**
	     * Calculate scrollbar size
	     */
	    SimpleBarCore.prototype.getScrollbarSize = function (axis) {
	        var _a, _b;
	        if (axis === void 0) { axis = 'y'; }
	        if (!this.axis[axis].isOverflowing || !this.contentEl) {
	            return 0;
	        }
	        var contentSize = this.contentEl[this.axis[axis].scrollSizeAttr];
	        var trackSize = (_b = (_a = this.axis[axis].track.el) === null || _a === void 0 ? void 0 : _a[this.axis[axis].offsetSizeAttr]) !== null && _b !== void 0 ? _b : 0;
	        var scrollbarRatio = trackSize / contentSize;
	        var scrollbarSize;
	        // Calculate new height/position of drag handle.
	        scrollbarSize = Math.max(~~(scrollbarRatio * trackSize), this.options.scrollbarMinSize);
	        if (this.options.scrollbarMaxSize) {
	            scrollbarSize = Math.min(scrollbarSize, this.options.scrollbarMaxSize);
	        }
	        return scrollbarSize;
	    };
	    SimpleBarCore.prototype.positionScrollbar = function (axis) {
	        var _a, _b, _c;
	        if (axis === void 0) { axis = 'y'; }
	        var scrollbar = this.axis[axis].scrollbar;
	        if (!this.axis[axis].isOverflowing ||
	            !this.contentWrapperEl ||
	            !scrollbar.el ||
	            !this.elStyles) {
	            return;
	        }
	        var contentSize = this.contentWrapperEl[this.axis[axis].scrollSizeAttr];
	        var trackSize = ((_a = this.axis[axis].track.el) === null || _a === void 0 ? void 0 : _a[this.axis[axis].offsetSizeAttr]) || 0;
	        var hostSize = parseInt(this.elStyles[this.axis[axis].sizeAttr], 10);
	        var scrollOffset = this.contentWrapperEl[this.axis[axis].scrollOffsetAttr];
	        scrollOffset =
	            axis === 'x' &&
	                this.isRtl &&
	                ((_b = SimpleBarCore.getRtlHelpers()) === null || _b === void 0 ? void 0 : _b.isScrollOriginAtZero)
	                ? -scrollOffset
	                : scrollOffset;
	        if (axis === 'x' && this.isRtl) {
	            scrollOffset = ((_c = SimpleBarCore.getRtlHelpers()) === null || _c === void 0 ? void 0 : _c.isScrollingToNegative)
	                ? scrollOffset
	                : -scrollOffset;
	        }
	        var scrollPourcent = scrollOffset / (contentSize - hostSize);
	        var handleOffset = ~~((trackSize - scrollbar.size) * scrollPourcent);
	        handleOffset =
	            axis === 'x' && this.isRtl
	                ? -handleOffset + (trackSize - scrollbar.size)
	                : handleOffset;
	        scrollbar.el.style.transform =
	            axis === 'x'
	                ? "translate3d(".concat(handleOffset, "px, 0, 0)")
	                : "translate3d(0, ".concat(handleOffset, "px, 0)");
	    };
	    SimpleBarCore.prototype.toggleTrackVisibility = function (axis) {
	        if (axis === void 0) { axis = 'y'; }
	        var track = this.axis[axis].track.el;
	        var scrollbar = this.axis[axis].scrollbar.el;
	        if (!track || !scrollbar || !this.contentWrapperEl)
	            return;
	        if (this.axis[axis].isOverflowing || this.axis[axis].forceVisible) {
	            track.style.visibility = 'visible';
	            this.contentWrapperEl.style[this.axis[axis].overflowAttr] = 'scroll';
	            this.el.classList.add("".concat(this.classNames.scrollable, "-").concat(axis));
	        }
	        else {
	            track.style.visibility = 'hidden';
	            this.contentWrapperEl.style[this.axis[axis].overflowAttr] = 'hidden';
	            this.el.classList.remove("".concat(this.classNames.scrollable, "-").concat(axis));
	        }
	        // Even if forceVisible is enabled, scrollbar itself should be hidden
	        if (this.axis[axis].isOverflowing) {
	            scrollbar.style.display = 'block';
	        }
	        else {
	            scrollbar.style.display = 'none';
	        }
	    };
	    SimpleBarCore.prototype.showScrollbar = function (axis) {
	        if (axis === void 0) { axis = 'y'; }
	        if (this.axis[axis].isOverflowing && !this.axis[axis].scrollbar.isVisible) {
	            addClasses$2(this.axis[axis].scrollbar.el, this.classNames.visible);
	            this.axis[axis].scrollbar.isVisible = true;
	        }
	    };
	    SimpleBarCore.prototype.hideScrollbar = function (axis) {
	        if (axis === void 0) { axis = 'y'; }
	        if (this.axis[axis].isOverflowing && this.axis[axis].scrollbar.isVisible) {
	            removeClasses(this.axis[axis].scrollbar.el, this.classNames.visible);
	            this.axis[axis].scrollbar.isVisible = false;
	        }
	    };
	    SimpleBarCore.prototype.hideNativeScrollbar = function () {
	        if (!this.offsetEl)
	            return;
	        this.offsetEl.style[this.isRtl ? 'left' : 'right'] =
	            this.axis.y.isOverflowing || this.axis.y.forceVisible
	                ? "-".concat(this.scrollbarWidth, "px")
	                : '0px';
	        this.offsetEl.style.bottom =
	            this.axis.x.isOverflowing || this.axis.x.forceVisible
	                ? "-".concat(this.scrollbarWidth, "px")
	                : '0px';
	    };
	    SimpleBarCore.prototype.onMouseMoveForAxis = function (axis) {
	        if (axis === void 0) { axis = 'y'; }
	        var currentAxis = this.axis[axis];
	        if (!currentAxis.track.el || !currentAxis.scrollbar.el)
	            return;
	        currentAxis.track.rect = currentAxis.track.el.getBoundingClientRect();
	        currentAxis.scrollbar.rect =
	            currentAxis.scrollbar.el.getBoundingClientRect();
	        if (this.isWithinBounds(currentAxis.track.rect)) {
	            this.showScrollbar(axis);
	            addClasses$2(currentAxis.track.el, this.classNames.hover);
	            if (this.isWithinBounds(currentAxis.scrollbar.rect)) {
	                addClasses$2(currentAxis.scrollbar.el, this.classNames.hover);
	            }
	            else {
	                removeClasses(currentAxis.scrollbar.el, this.classNames.hover);
	            }
	        }
	        else {
	            removeClasses(currentAxis.track.el, this.classNames.hover);
	            if (this.options.autoHide) {
	                this.hideScrollbar(axis);
	            }
	        }
	    };
	    SimpleBarCore.prototype.onMouseLeaveForAxis = function (axis) {
	        if (axis === void 0) { axis = 'y'; }
	        removeClasses(this.axis[axis].track.el, this.classNames.hover);
	        removeClasses(this.axis[axis].scrollbar.el, this.classNames.hover);
	        if (this.options.autoHide) {
	            this.hideScrollbar(axis);
	        }
	    };
	    /**
	     * on scrollbar handle drag movement starts
	     */
	    SimpleBarCore.prototype.onDragStart = function (e, axis) {
	        var _a;
	        if (axis === void 0) { axis = 'y'; }
	        var elDocument = getElementDocument(this.el);
	        var elWindow = getElementWindow(this.el);
	        var scrollbar = this.axis[axis].scrollbar;
	        // Measure how far the user's mouse is from the top of the scrollbar drag handle.
	        var eventOffset = axis === 'y' ? e.pageY : e.pageX;
	        this.axis[axis].dragOffset =
	            eventOffset - (((_a = scrollbar.rect) === null || _a === void 0 ? void 0 : _a[this.axis[axis].offsetAttr]) || 0);
	        this.draggedAxis = axis;
	        addClasses$2(this.el, this.classNames.dragging);
	        elDocument.addEventListener('mousemove', this.drag, true);
	        elDocument.addEventListener('mouseup', this.onEndDrag, true);
	        if (this.removePreventClickId === null) {
	            elDocument.addEventListener('click', this.preventClick, true);
	            elDocument.addEventListener('dblclick', this.preventClick, true);
	        }
	        else {
	            elWindow.clearTimeout(this.removePreventClickId);
	            this.removePreventClickId = null;
	        }
	    };
	    SimpleBarCore.prototype.onTrackClick = function (e, axis) {
	        var _this = this;
	        var _a, _b, _c, _d;
	        if (axis === void 0) { axis = 'y'; }
	        var currentAxis = this.axis[axis];
	        if (!this.options.clickOnTrack ||
	            !currentAxis.scrollbar.el ||
	            !this.contentWrapperEl)
	            return;
	        // Preventing the event's default to trigger click underneath
	        e.preventDefault();
	        var elWindow = getElementWindow(this.el);
	        this.axis[axis].scrollbar.rect =
	            currentAxis.scrollbar.el.getBoundingClientRect();
	        var scrollbar = this.axis[axis].scrollbar;
	        var scrollbarOffset = (_b = (_a = scrollbar.rect) === null || _a === void 0 ? void 0 : _a[this.axis[axis].offsetAttr]) !== null && _b !== void 0 ? _b : 0;
	        var hostSize = parseInt((_d = (_c = this.elStyles) === null || _c === void 0 ? void 0 : _c[this.axis[axis].sizeAttr]) !== null && _d !== void 0 ? _d : '0px', 10);
	        var scrolled = this.contentWrapperEl[this.axis[axis].scrollOffsetAttr];
	        var t = axis === 'y'
	            ? this.mouseY - scrollbarOffset
	            : this.mouseX - scrollbarOffset;
	        var dir = t < 0 ? -1 : 1;
	        var scrollSize = dir === -1 ? scrolled - hostSize : scrolled + hostSize;
	        var speed = 40;
	        var scrollTo = function () {
	            if (!_this.contentWrapperEl)
	                return;
	            if (dir === -1) {
	                if (scrolled > scrollSize) {
	                    scrolled -= speed;
	                    _this.contentWrapperEl[_this.axis[axis].scrollOffsetAttr] = scrolled;
	                    elWindow.requestAnimationFrame(scrollTo);
	                }
	            }
	            else {
	                if (scrolled < scrollSize) {
	                    scrolled += speed;
	                    _this.contentWrapperEl[_this.axis[axis].scrollOffsetAttr] = scrolled;
	                    elWindow.requestAnimationFrame(scrollTo);
	                }
	            }
	        };
	        scrollTo();
	    };
	    /**
	     * Getter for content element
	     */
	    SimpleBarCore.prototype.getContentElement = function () {
	        return this.contentEl;
	    };
	    /**
	     * Getter for original scrolling element
	     */
	    SimpleBarCore.prototype.getScrollElement = function () {
	        return this.contentWrapperEl;
	    };
	    SimpleBarCore.prototype.removeListeners = function () {
	        var elWindow = getElementWindow(this.el);
	        // Event listeners
	        this.el.removeEventListener('mouseenter', this.onMouseEnter);
	        this.el.removeEventListener('pointerdown', this.onPointerEvent, true);
	        this.el.removeEventListener('mousemove', this.onMouseMove);
	        this.el.removeEventListener('mouseleave', this.onMouseLeave);
	        if (this.contentWrapperEl) {
	            this.contentWrapperEl.removeEventListener('scroll', this.onScroll);
	        }
	        elWindow.removeEventListener('resize', this.onWindowResize);
	        if (this.mutationObserver) {
	            this.mutationObserver.disconnect();
	        }
	        if (this.resizeObserver) {
	            this.resizeObserver.disconnect();
	        }
	        // Cancel all debounced functions
	        this.onMouseMove.cancel();
	        this.onWindowResize.cancel();
	        this.onStopScrolling.cancel();
	        this.onMouseEntered.cancel();
	    };
	    /**
	     * Remove all listeners from DOM nodes
	     */
	    SimpleBarCore.prototype.unMount = function () {
	        this.removeListeners();
	    };
	    /**
	     * Check if mouse is within bounds
	     */
	    SimpleBarCore.prototype.isWithinBounds = function (bbox) {
	        return (this.mouseX >= bbox.left &&
	            this.mouseX <= bbox.left + bbox.width &&
	            this.mouseY >= bbox.top &&
	            this.mouseY <= bbox.top + bbox.height);
	    };
	    /**
	     * Find element children matches query
	     */
	    SimpleBarCore.prototype.findChild = function (el, query) {
	        var matches = el.matches ||
	            el.webkitMatchesSelector ||
	            el.mozMatchesSelector ||
	            el.msMatchesSelector;
	        return Array.prototype.filter.call(el.children, function (child) {
	            return matches.call(child, query);
	        })[0];
	    };
	    SimpleBarCore.rtlHelpers = null;
	    SimpleBarCore.defaultOptions = {
	        forceVisible: false,
	        clickOnTrack: true,
	        scrollbarMinSize: 25,
	        scrollbarMaxSize: 0,
	        ariaLabel: 'scrollable content',
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
	        scrollableNode: null,
	        contentNode: null,
	        autoHide: true
	    };
	    /**
	     * Static functions
	     */
	    SimpleBarCore.getOptions = getOptions$2;
	    SimpleBarCore.helpers = helpers;
	    return SimpleBarCore;
	}());

	/**
	 * simplebar - v6.2.5
	 * Scrollbars, simpler.
	 * https://grsmto.github.io/simplebar/
	 *
	 * Made by Adrien Denat from a fork by Jonathan Nicol
	 * Under MIT License
	 */


	/******************************************************************************
	Copyright (c) Microsoft Corporation.

	Permission to use, copy, modify, and/or distribute this software for any
	purpose with or without fee is hereby granted.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
	REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
	AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
	INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
	OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
	PERFORMANCE OF THIS SOFTWARE.
	***************************************************************************** */
	/* global Reflect, Promise */

	var extendStatics = function(d, b) {
	    extendStatics = Object.setPrototypeOf ||
	        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
	    return extendStatics(d, b);
	};

	function __extends(d, b) {
	    if (typeof b !== "function" && b !== null)
	        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
	    extendStatics(d, b);
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	}

	var _a = SimpleBarCore.helpers, getOptions = _a.getOptions, addClasses = _a.addClasses;
	var SimpleBar = /** @class */ (function (_super) {
	    __extends(SimpleBar, _super);
	    function SimpleBar() {
	        var args = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            args[_i] = arguments[_i];
	        }
	        var _this = _super.apply(this, args) || this;
	        // // Save a reference to the instance, so we know this DOM node has already been instancied
	        SimpleBar.instances.set(args[0], _this);
	        return _this;
	    }
	    SimpleBar.initDOMLoadedElements = function () {
	        document.removeEventListener('DOMContentLoaded', this.initDOMLoadedElements);
	        window.removeEventListener('load', this.initDOMLoadedElements);
	        Array.prototype.forEach.call(document.querySelectorAll('[data-simplebar]'), function (el) {
	            if (el.getAttribute('data-simplebar') !== 'init' &&
	                !SimpleBar.instances.has(el))
	                new SimpleBar(el, getOptions(el.attributes));
	        });
	    };
	    SimpleBar.removeObserver = function () {
	        var _a;
	        (_a = SimpleBar.globalObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
	    };
	    SimpleBar.prototype.initDOM = function () {
	        var _this = this;
	        var _a, _b, _c;
	        // make sure this element doesn't have the elements yet
	        if (!Array.prototype.filter.call(this.el.children, function (child) {
	            return child.classList.contains(_this.classNames.wrapper);
	        }).length) {
	            // Prepare DOM
	            this.wrapperEl = document.createElement('div');
	            this.contentWrapperEl = document.createElement('div');
	            this.offsetEl = document.createElement('div');
	            this.maskEl = document.createElement('div');
	            this.contentEl = document.createElement('div');
	            this.placeholderEl = document.createElement('div');
	            this.heightAutoObserverWrapperEl = document.createElement('div');
	            this.heightAutoObserverEl = document.createElement('div');
	            addClasses(this.wrapperEl, this.classNames.wrapper);
	            addClasses(this.contentWrapperEl, this.classNames.contentWrapper);
	            addClasses(this.offsetEl, this.classNames.offset);
	            addClasses(this.maskEl, this.classNames.mask);
	            addClasses(this.contentEl, this.classNames.contentEl);
	            addClasses(this.placeholderEl, this.classNames.placeholder);
	            addClasses(this.heightAutoObserverWrapperEl, this.classNames.heightAutoObserverWrapperEl);
	            addClasses(this.heightAutoObserverEl, this.classNames.heightAutoObserverEl);
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
	            (_a = this.contentWrapperEl) === null || _a === void 0 ? void 0 : _a.setAttribute('tabindex', '0');
	            (_b = this.contentWrapperEl) === null || _b === void 0 ? void 0 : _b.setAttribute('role', 'region');
	            (_c = this.contentWrapperEl) === null || _c === void 0 ? void 0 : _c.setAttribute('aria-label', this.options.ariaLabel);
	        }
	        if (!this.axis.x.track.el || !this.axis.y.track.el) {
	            var track = document.createElement('div');
	            var scrollbar = document.createElement('div');
	            addClasses(track, this.classNames.track);
	            addClasses(scrollbar, this.classNames.scrollbar);
	            track.appendChild(scrollbar);
	            this.axis.x.track.el = track.cloneNode(true);
	            addClasses(this.axis.x.track.el, this.classNames.horizontal);
	            this.axis.y.track.el = track.cloneNode(true);
	            addClasses(this.axis.y.track.el, this.classNames.vertical);
	            this.el.appendChild(this.axis.x.track.el);
	            this.el.appendChild(this.axis.y.track.el);
	        }
	        SimpleBarCore.prototype.initDOM.call(this);
	        this.el.setAttribute('data-simplebar', 'init');
	    };
	    SimpleBar.prototype.unMount = function () {
	        SimpleBarCore.prototype.unMount.call(this);
	        SimpleBar.instances["delete"](this.el);
	    };
	    SimpleBar.initHtmlApi = function () {
	        this.initDOMLoadedElements = this.initDOMLoadedElements.bind(this);
	        // MutationObserver is IE11+
	        if (typeof MutationObserver !== 'undefined') {
	            // Mutation observer to observe dynamically added elements
	            this.globalObserver = new MutationObserver(SimpleBar.handleMutations);
	            this.globalObserver.observe(document, { childList: true, subtree: true });
	        }
	        // Taken from jQuery `ready` function
	        // Instantiate elements already present on the page
	        if (document.readyState === 'complete' || // @ts-ignore: IE specific
	            (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
	            // Handle it asynchronously to allow scripts the opportunity to delay init
	            window.setTimeout(this.initDOMLoadedElements);
	        }
	        else {
	            document.addEventListener('DOMContentLoaded', this.initDOMLoadedElements);
	            window.addEventListener('load', this.initDOMLoadedElements);
	        }
	    };
	    SimpleBar.handleMutations = function (mutations) {
	        mutations.forEach(function (mutation) {
	            mutation.addedNodes.forEach(function (addedNode) {
	                if (addedNode.nodeType === 1) {
	                    if (addedNode.hasAttribute('data-simplebar')) {
	                        !SimpleBar.instances.has(addedNode) &&
	                            document.documentElement.contains(addedNode) &&
	                            new SimpleBar(addedNode, getOptions(addedNode.attributes));
	                    }
	                    else {
	                        addedNode
	                            .querySelectorAll('[data-simplebar]')
	                            .forEach(function (el) {
	                            if (el.getAttribute('data-simplebar') !== 'init' &&
	                                !SimpleBar.instances.has(el) &&
	                                document.documentElement.contains(el))
	                                new SimpleBar(el, getOptions(el.attributes));
	                        });
	                    }
	                }
	            });
	            mutation.removedNodes.forEach(function (removedNode) {
	                if (removedNode.nodeType === 1) {
	                    if (removedNode.getAttribute('data-simplebar') === 'init') {
	                        SimpleBar.instances.has(removedNode) &&
	                            !document.documentElement.contains(removedNode) &&
	                            SimpleBar.instances.get(removedNode).unMount();
	                    }
	                    else {
	                        Array.prototype.forEach.call(removedNode.querySelectorAll('[data-simplebar="init"]'), function (el) {
	                            SimpleBar.instances.has(el) &&
	                                !document.documentElement.contains(el) &&
	                                SimpleBar.instances.get(el).unMount();
	                        });
	                    }
	                }
	            });
	        });
	    };
	    SimpleBar.instances = new WeakMap();
	    return SimpleBar;
	}(SimpleBarCore));
	/**
	 * HTML API
	 * Called only in a browser env.
	 */
	if (canUseDOM$1) {
	    SimpleBar.initHtmlApi();
	}

	/* src/components/SimpleBar.svelte generated by Svelte v4.1.2 */

	function create_fragment$3(ctx) {
		let div12;
		let div7;
		let div1;
		let t0;
		let div5;
		let div4;
		let div3;
		let div2;
		let t1;
		let div6;
		let t2;
		let div9;
		let t3;
		let div11;
		let current;
		const default_slot_template = /*#slots*/ ctx[5].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

		return {
			c() {
				div12 = element("div");
				div7 = element("div");
				div1 = element("div");
				div1.innerHTML = `<div class="simplebar-height-auto-observer"></div>`;
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
				div9.innerHTML = `<div class="simplebar-scrollbar"></div>`;
				t3 = space();
				div11 = element("div");
				div11.innerHTML = `<div class="simplebar-scrollbar"></div>`;
				attr(div1, "class", "simplebar-height-auto-observer-wrapper");
				attr(div2, "class", "simplebar-content");
				attr(div3, "class", "simplebar-content-wrapper");
				attr(div4, "class", "simplebar-offset");
				attr(div5, "class", "simplebar-mask");
				attr(div6, "class", "simplebar-placeholder");
				attr(div7, "class", "simplebar-wrapper");
				attr(div9, "class", "simplebar-track simplebar-horizontal");
				attr(div11, "class", "simplebar-track simplebar-vertical");
				set_style(div12, "max-height", /*maxHeight*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, div12, anchor);
				append(div12, div7);
				append(div7, div1);
				append(div7, t0);
				append(div7, div5);
				append(div5, div4);
				append(div4, div3);
				append(div3, div2);

				if (default_slot) {
					default_slot.m(div2, null);
				}

				/*div2_binding*/ ctx[6](div2);
				/*div3_binding*/ ctx[7](div3);
				append(div7, t1);
				append(div7, div6);
				append(div12, t2);
				append(div12, div9);
				append(div12, t3);
				append(div12, div11);
				/*div12_binding*/ ctx[8](div12);
				current = true;
			},
			p(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[4],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
							null
						);
					}
				}

				if (!current || dirty & /*maxHeight*/ 1) {
					set_style(div12, "max-height", /*maxHeight*/ ctx[0]);
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div12);
				}

				if (default_slot) default_slot.d(detaching);
				/*div2_binding*/ ctx[6](null);
				/*div3_binding*/ ctx[7](null);
				/*div12_binding*/ ctx[8](null);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		let { maxHeight = "300px" } = $$props;
		let container;
		let scrollElement;
		let contentElement;

		onMount(async () => {
			new SimpleBar(container);
		});

		function div2_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				contentElement = $$value;
				$$invalidate(3, contentElement);
			});
		}

		function div3_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				scrollElement = $$value;
				$$invalidate(2, scrollElement);
			});
		}

		function div12_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				container = $$value;
				$$invalidate(1, container);
			});
		}

		$$self.$$set = $$props => {
			if ('maxHeight' in $$props) $$invalidate(0, maxHeight = $$props.maxHeight);
			if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
		};

		return [
			maxHeight,
			container,
			scrollElement,
			contentElement,
			$$scope,
			slots,
			div2_binding,
			div3_binding,
			div12_binding
		];
	}

	class SimpleBar_1 extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$3, safe_not_equal, { maxHeight: 0 });
		}
	}

	const subscriber_queue = [];

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop$1) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
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

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop$1) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop$1;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
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

	const { dialog } = require("electron");
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

	/* src/components/sidebar.svelte generated by Svelte v4.1.2 */

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[9] = list[i].id;
		child_ctx[10] = list[i].name;
		child_ctx[11] = list[i].path;
		return child_ctx;
	}

	// (154:6) {#if packages.npm}
	function create_if_block_3$1(ctx) {
		let button;
		let svg;
		let path_1;
		let t0;
		let span;
		let t1_value = /*packages*/ ctx[0].npm + "";
		let t1;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				svg = svg_element("svg");
				path_1 = svg_element("path");
				t0 = text("\n          Npm\n          ");
				span = element("span");
				t1 = text(t1_value);
				attr(path_1, "d", "M 0 10 L 0 21 L 9 21 L 9 23 L 16 23 L 16 21 L 32 21 L 32 10 L 0\n              10 z M 1.7773438 11.777344 L 8.8886719 11.777344 L 8.890625\n              11.777344 L 8.890625 19.445312 L 7.1113281 19.445312 L 7.1113281\n              13.556641 L 5.3339844 13.556641 L 5.3339844 19.445312 L 1.7773438\n              19.445312 L 1.7773438 11.777344 z M 10.667969 11.777344 L\n              17.777344 11.777344 L 17.779297 11.777344 L 17.779297 19.443359 L\n              14.222656 19.443359 L 14.222656 21.222656 L 10.667969 21.222656 L\n              10.667969 11.777344 z M 19.556641 11.777344 L 30.222656 11.777344\n              L 30.224609 11.777344 L 30.224609 19.445312 L 28.445312 19.445312\n              L 28.445312 13.556641 L 26.667969 13.556641 L 26.667969 19.445312\n              L 24.890625 19.445312 L 24.890625 13.556641 L 23.111328 13.556641\n              L 23.111328 19.445312 L 19.556641 19.445312 L 19.556641 11.777344\n              z M 14.222656 13.556641 L 14.222656 17.667969 L 16 17.667969 L 16\n              13.556641 L 14.222656 13.556641 z");
				attr(svg, "class", "ui__iconGlobal svelte-1gftbjo");
				attr(svg, "viewBox", "0 0 32 32");
				attr(svg, "xmlns", "http://www.w3.org/2000/svg");
				attr(span, "class", "svelte-1gftbjo");
				attr(button, "class", "sidebarList__item svelte-1gftbjo");
				toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_1`);
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, svg);
				append(svg, path_1);
				append(button, t0);
				append(button, span);
				append(span, t1);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[3]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*packages*/ 1 && t1_value !== (t1_value = /*packages*/ ctx[0].npm + "")) set_data(t1, t1_value);

				if (dirty & /*$menuActive*/ 2) {
					toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_1`);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (185:6) {#if packages.yarn}
	function create_if_block_2$1(ctx) {
		let button;
		let svg;
		let path_1;
		let t0;
		let span;
		let t1_value = /*packages*/ ctx[0].yarn + "";
		let t1;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				svg = svg_element("svg");
				path_1 = svg_element("path");
				t0 = text("\n          Yarn\n          ");
				span = element("span");
				t1 = text(t1_value);
				attr(path_1, "d", "M 16 3 C 8.8 3 3 8.8 3 16 C 3 23.2 8.8 29 16 29 C 23.2 29 29\n              23.2 29 16 C 29 8.8 23.2 3 16 3 z M 16 5 C 22.1 5 27 9.9 27 16 C\n              27 22.1 22.1 27 16 27 C 9.9 27 5 22.1 5 16 C 5 9.9 9.9 5 16 5 z M\n              16.208984 9.0449219 C 15.75918 9.1214844 15.300781 10.5 15.300781\n              10.5 C 15.300781 10.5 14.099609 10.300781 13.099609 11.300781 C\n              12.899609 11.500781 12.700391 11.599219 12.400391 11.699219 C\n              12.300391 11.799219 12.2 11.800391 12 12.400391 C 11.6 13.300391\n              12.599609 14.400391 12.599609 14.400391 C 10.499609 15.900391\n              10.599219 17.900391 10.699219 18.400391 C 9.3992187 19.500391\n              9.8992187 20.900781 10.199219 21.300781 C 10.399219 21.600781\n              10.599219 21.5 10.699219 21.5 C 10.699219 21.6 10.199219 22.200391\n              10.699219 22.400391 C 11.199219 22.700391 12.000391 22.800391\n              12.400391 22.400391 C 12.700391 22.100391 12.800391 21.499219\n              12.900391 21.199219 C 13.000391 21.099219 13.000391 21.399609\n              13.400391 21.599609 C 13.400391 21.599609 12.7 21.899609 13\n              22.599609 C 13.1 22.799609 13.4 23 14 23 C 14.2 23 16.599219\n              22.899219 17.199219 22.699219 C 17.599219 22.599219 17.699219\n              22.400391 17.699219 22.400391 C 20.299219 21.700391 20.799609\n              20.599219 22.599609 20.199219 C 23.199609 20.099219 23.199609\n              19.099219 22.099609 19.199219 C 21.299609 19.199219 20.6 19.6 20\n              20 C 19 20.6 18.300781 20.699609 18.300781 20.599609 C 18.200781\n              20.499609 18.699219 19.3 18.199219 18 C 17.699219 16.6 16.800391\n              16.199609 16.900391 16.099609 C 17.200391 15.599609 17.899219\n              14.800391 18.199219 13.400391 C 18.299219 12.500391 18.300391\n              11.000781 17.900391 10.300781 C 17.800391 10.100781 17.199219 10.5\n              17.199219 10.5 C 17.199219 10.5 16.600391 9.1996094 16.400391\n              9.0996094 C 16.337891 9.0496094 16.273242 9.0339844 16.208984\n              9.0449219 z");
				attr(svg, "class", "ui__iconGlobal svelte-1gftbjo");
				attr(svg, "viewBox", "0 0 32 32");
				attr(svg, "xmlns", "http://www.w3.org/2000/svg");
				attr(span, "class", "svelte-1gftbjo");
				attr(button, "class", "sidebarList__item svelte-1gftbjo");
				toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_2`);
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, svg);
				append(svg, path_1);
				append(button, t0);
				append(button, span);
				append(span, t1);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_1*/ ctx[4]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*packages*/ 1 && t1_value !== (t1_value = /*packages*/ ctx[0].yarn + "")) set_data(t1, t1_value);

				if (dirty & /*$menuActive*/ 2) {
					toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_2`);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (230:6) {#if packages.pnpm}
	function create_if_block_1$1(ctx) {
		let button;
		let svg;
		let path_1;
		let t0;
		let span;
		let t1_value = /*packages*/ ctx[0].pnpm + "";
		let t1;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				svg = svg_element("svg");
				path_1 = svg_element("path");
				t0 = text("\n          Pnpm\n          ");
				span = element("span");
				t1 = text(t1_value);
				attr(path_1, "d", "M 16 3 C 8.8 3 3 8.8 3 16 C 3 23.2 8.8 29 16 29 C 23.2 29 29\n              23.2 29 16 C 29 8.8 23.2 3 16 3 z M 16 5 C 22.1 5 27 9.9 27 16 C\n              27 22.1 22.1 27 16 27 C 9.9 27 5 22.1 5 16 C 5 9.9 9.9 5 16 5 z M\n              16.208984 9.0449219 C 15.75918 9.1214844 15.300781 10.5 15.300781\n              10.5 C 15.300781 10.5 14.099609 10.300781 13.099609 11.300781 C\n              12.899609 11.500781 12.700391 11.599219 12.400391 11.699219 C\n              12.300391 11.799219 12.2 11.800391 12 12.400391 C 11.6 13.300391\n              12.599609 14.400391 12.599609 14.400391 C 10.499609 15.900391\n              10.599219 17.900391 10.699219 18.400391 C 9.3992187 19.500391\n              9.8992187 20.900781 10.199219 21.300781 C 10.399219 21.600781\n              10.599219 21.5 10.699219 21.5 C 10.699219 21.6 10.199219 22.200391\n              10.699219 22.400391 C 11.199219 22.700391 12.000391 22.800391\n              12.400391 22.400391 C 12.700391 22.100391 12.800391 21.499219\n              12.900391 21.199219 C 13.000391 21.099219 13.000391 21.399609\n              13.400391 21.599609 C 13.400391 21.599609 12.7 21.899609 13\n              22.599609 C 13.1 22.799609 13.4 23 14 23 C 14.2 23 16.599219\n              22.899219 17.199219 22.699219 C 17.599219 22.599219 17.699219\n              22.400391 17.699219 22.400391 C 20.299219 21.700391 20.799609\n              20.599219 22.599609 20.199219 C 23.199609 20.099219 23.199609\n              19.099219 22.099609 19.199219 C 21.299609 19.199219 20.6 19.6 20\n              20 C 19 20.6 18.300781 20.699609 18.300781 20.599609 C 18.200781\n              20.499609 18.699219 19.3 18.199219 18 C 17.699219 16.6 16.800391\n              16.199609 16.900391 16.099609 C 17.200391 15.599609 17.899219\n              14.800391 18.199219 13.400391 C 18.299219 12.500391 18.300391\n              11.000781 17.900391 10.300781 C 17.800391 10.100781 17.199219 10.5\n              17.199219 10.5 C 17.199219 10.5 16.600391 9.1996094 16.400391\n              9.0996094 C 16.337891 9.0496094 16.273242 9.0339844 16.208984\n              9.0449219 z");
				attr(svg, "class", "ui__iconGlobal svelte-1gftbjo");
				attr(svg, "viewBox", "0 0 32 32");
				attr(svg, "xmlns", "http://www.w3.org/2000/svg");
				attr(span, "class", "svelte-1gftbjo");
				attr(button, "class", "sidebarList__item svelte-1gftbjo");
				toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_3`);
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, svg);
				append(svg, path_1);
				append(button, t0);
				append(button, span);
				append(span, t1);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_2*/ ctx[5]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*packages*/ 1 && t1_value !== (t1_value = /*packages*/ ctx[0].pnpm + "")) set_data(t1, t1_value);

				if (dirty & /*$menuActive*/ 2) {
					toggle_class(button, "active", /*$menuActive*/ ctx[1] === `global_3`);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (278:6) {#if $projects}
	function create_if_block$1(ctx) {
		let each_1_anchor;
		let each_value = ensure_array_like(/*$projects*/ ctx[2]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		return {
			c() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert(target, each_1_anchor, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*$menuActive, $projects, localStorage, JSON*/ 6) {
					each_value = ensure_array_like(/*$projects*/ ctx[2]);
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
			d(detaching) {
				if (detaching) {
					detach(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	// (279:8) {#each $projects as { id, name, path }}
	function create_each_block$1(ctx) {
		let button1;
		let svg0;
		let path_1;
		let t0;
		let t1_value = /*name*/ ctx[10] + "";
		let t1;
		let t2;
		let button0;
		let t3;
		let mounted;
		let dispose;

		function click_handler_3() {
			return /*click_handler_3*/ ctx[6](/*id*/ ctx[9]);
		}

		function click_handler_4() {
			return /*click_handler_4*/ ctx[7](/*id*/ ctx[9]);
		}

		return {
			c() {
				button1 = element("button");
				svg0 = svg_element("svg");
				path_1 = svg_element("path");
				t0 = space();
				t1 = text(t1_value);
				t2 = space();
				button0 = element("button");
				button0.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="svelte-1gftbjo"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>`;
				t3 = space();
				attr(path_1, "d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2\n                3h9a2 2 0 0 1 2 2z");
				attr(svg0, "class", "ui__iconProject svelte-1gftbjo");
				attr(svg0, "viewBox", "0 0 24 24");
				attr(svg0, "xmlns", "http://www.w3.org/2000/svg");
				attr(button0, "class", "sidebarList__itemRemove svelte-1gftbjo");
				attr(button1, "class", "sidebarList__item svelte-1gftbjo");
				toggle_class(button1, "active", /*$menuActive*/ ctx[1] === `project_${/*id*/ ctx[9]}`);
			},
			m(target, anchor) {
				insert(target, button1, anchor);
				append(button1, svg0);
				append(svg0, path_1);
				append(button1, t0);
				append(button1, t1);
				append(button1, t2);
				append(button1, button0);
				append(button1, t3);

				if (!mounted) {
					dispose = [
						listen(button0, "click", click_handler_3),
						listen(button1, "click", click_handler_4)
					];

					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*$projects*/ 4 && t1_value !== (t1_value = /*name*/ ctx[10] + "")) set_data(t1, t1_value);

				if (dirty & /*$menuActive, $projects*/ 6) {
					toggle_class(button1, "active", /*$menuActive*/ ctx[1] === `project_${/*id*/ ctx[9]}`);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button1);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (151:2) <SimpleBar maxHeight={'calc(100vh - 105px)'}>
	function create_default_slot$1(ctx) {
		let section0;
		let h10;
		let t1;
		let t2;
		let t3;
		let t4;
		let section1;
		let h11;
		let t6;
		let if_block0 = /*packages*/ ctx[0].npm && create_if_block_3$1(ctx);
		let if_block1 = /*packages*/ ctx[0].yarn && create_if_block_2$1(ctx);
		let if_block2 = /*packages*/ ctx[0].pnpm && create_if_block_1$1(ctx);
		let if_block3 = /*$projects*/ ctx[2] && create_if_block$1(ctx);

		return {
			c() {
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
				attr(h10, "class", "sidebarList__title svelte-1gftbjo");
				attr(section0, "class", "sidebarList");
				attr(h11, "class", "sidebarList__title svelte-1gftbjo");
				attr(section1, "class", "sidebarList");
			},
			m(target, anchor) {
				insert(target, section0, anchor);
				append(section0, h10);
				append(section0, t1);
				if (if_block0) if_block0.m(section0, null);
				append(section0, t2);
				if (if_block1) if_block1.m(section0, null);
				append(section0, t3);
				if (if_block2) if_block2.m(section0, null);
				insert(target, t4, anchor);
				insert(target, section1, anchor);
				append(section1, h11);
				append(section1, t6);
				if (if_block3) if_block3.m(section1, null);
			},
			p(ctx, dirty) {
				if (/*packages*/ ctx[0].npm) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_3$1(ctx);
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
						if_block1 = create_if_block_2$1(ctx);
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
						if_block2 = create_if_block_1$1(ctx);
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
						if_block3 = create_if_block$1(ctx);
						if_block3.c();
						if_block3.m(section1, null);
					}
				} else if (if_block3) {
					if_block3.d(1);
					if_block3 = null;
				}
			},
			d(detaching) {
				if (detaching) {
					detach(section0);
					detach(t4);
					detach(section1);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				if (if_block3) if_block3.d();
			}
		};
	}

	function create_fragment$2(ctx) {
		let aside;
		let simplebar;
		let t0;
		let button;
		let current;
		let mounted;
		let dispose;

		simplebar = new SimpleBar_1({
				props: {
					maxHeight: 'calc(100vh - 105px)',
					$$slots: { default: [create_default_slot$1] },
					$$scope: { ctx }
				}
			});

		return {
			c() {
				aside = element("aside");
				create_component(simplebar.$$.fragment);
				t0 = space();
				button = element("button");
				button.textContent = "Add Project";
				attr(button, "class", "addProject svelte-1gftbjo");
				attr(aside, "class", "sidebar svelte-1gftbjo");
			},
			m(target, anchor) {
				insert(target, aside, anchor);
				mount_component(simplebar, aside, null);
				append(aside, t0);
				append(aside, button);
				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_5*/ ctx[8]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				const simplebar_changes = {};

				if (dirty & /*$$scope, $projects, $menuActive, packages*/ 16391) {
					simplebar_changes.$$scope = { dirty, ctx };
				}

				simplebar.$set(simplebar_changes);
			},
			i(local) {
				if (current) return;
				transition_in(simplebar.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(simplebar.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(aside);
				}

				destroy_component(simplebar);
				mounted = false;
				dispose();
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let $menuActive;
		let $projects;
		component_subscribe($$self, menuActive, $$value => $$invalidate(1, $menuActive = $$value));
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
			localStorage.setItem('projects', JSON.stringify(projectFilter));
		};

		const click_handler_4 = id => {
			menuActive.set(`project_${id}`);
		};

		const click_handler_5 = () => {
			openDirectory().then(result => {
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
			}).catch(err => {
				console.log(err);
			});
		};

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

	class Sidebar extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$2, safe_not_equal, {});
		}
	}

	function bind(fn, thisArg) {
	  return function wrap() {
	    return fn.apply(thisArg, arguments);
	  };
	}

	// utils is a library of generic helper functions non-specific to axios

	const {toString} = Object.prototype;
	const {getPrototypeOf} = Object;

	const kindOf = (cache => thing => {
	    const str = toString.call(thing);
	    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
	})(Object.create(null));

	const kindOfTest = (type) => {
	  type = type.toLowerCase();
	  return (thing) => kindOf(thing) === type
	};

	const typeOfTest = type => thing => typeof thing === type;

	/**
	 * Determine if a value is an Array
	 *
	 * @param {Object} val The value to test
	 *
	 * @returns {boolean} True if value is an Array, otherwise false
	 */
	const {isArray} = Array;

	/**
	 * Determine if a value is undefined
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if the value is undefined, otherwise false
	 */
	const isUndefined = typeOfTest('undefined');

	/**
	 * Determine if a value is a Buffer
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Buffer, otherwise false
	 */
	function isBuffer(val) {
	  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
	    && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
	}

	/**
	 * Determine if a value is an ArrayBuffer
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
	 */
	const isArrayBuffer = kindOfTest('ArrayBuffer');


	/**
	 * Determine if a value is a view on an ArrayBuffer
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
	 */
	function isArrayBufferView(val) {
	  let result;
	  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
	    result = ArrayBuffer.isView(val);
	  } else {
	    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
	  }
	  return result;
	}

	/**
	 * Determine if a value is a String
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a String, otherwise false
	 */
	const isString = typeOfTest('string');

	/**
	 * Determine if a value is a Function
	 *
	 * @param {*} val The value to test
	 * @returns {boolean} True if value is a Function, otherwise false
	 */
	const isFunction = typeOfTest('function');

	/**
	 * Determine if a value is a Number
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Number, otherwise false
	 */
	const isNumber = typeOfTest('number');

	/**
	 * Determine if a value is an Object
	 *
	 * @param {*} thing The value to test
	 *
	 * @returns {boolean} True if value is an Object, otherwise false
	 */
	const isObject = (thing) => thing !== null && typeof thing === 'object';

	/**
	 * Determine if a value is a Boolean
	 *
	 * @param {*} thing The value to test
	 * @returns {boolean} True if value is a Boolean, otherwise false
	 */
	const isBoolean = thing => thing === true || thing === false;

	/**
	 * Determine if a value is a plain Object
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a plain Object, otherwise false
	 */
	const isPlainObject = (val) => {
	  if (kindOf(val) !== 'object') {
	    return false;
	  }

	  const prototype = getPrototypeOf(val);
	  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
	};

	/**
	 * Determine if a value is a Date
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Date, otherwise false
	 */
	const isDate = kindOfTest('Date');

	/**
	 * Determine if a value is a File
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a File, otherwise false
	 */
	const isFile = kindOfTest('File');

	/**
	 * Determine if a value is a Blob
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Blob, otherwise false
	 */
	const isBlob = kindOfTest('Blob');

	/**
	 * Determine if a value is a FileList
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a File, otherwise false
	 */
	const isFileList = kindOfTest('FileList');

	/**
	 * Determine if a value is a Stream
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Stream, otherwise false
	 */
	const isStream = (val) => isObject(val) && isFunction(val.pipe);

	/**
	 * Determine if a value is a FormData
	 *
	 * @param {*} thing The value to test
	 *
	 * @returns {boolean} True if value is an FormData, otherwise false
	 */
	const isFormData = (thing) => {
	  let kind;
	  return thing && (
	    (typeof FormData === 'function' && thing instanceof FormData) || (
	      isFunction(thing.append) && (
	        (kind = kindOf(thing)) === 'formdata' ||
	        // detect form-data instance
	        (kind === 'object' && isFunction(thing.toString) && thing.toString() === '[object FormData]')
	      )
	    )
	  )
	};

	/**
	 * Determine if a value is a URLSearchParams object
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
	 */
	const isURLSearchParams = kindOfTest('URLSearchParams');

	/**
	 * Trim excess whitespace off the beginning and end of a string
	 *
	 * @param {String} str The String to trim
	 *
	 * @returns {String} The String freed of excess whitespace
	 */
	const trim = (str) => str.trim ?
	  str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

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
	 *
	 * @param {Boolean} [allOwnKeys = false]
	 * @returns {any}
	 */
	function forEach(obj, fn, {allOwnKeys = false} = {}) {
	  // Don't bother if no value provided
	  if (obj === null || typeof obj === 'undefined') {
	    return;
	  }

	  let i;
	  let l;

	  // Force an array if not already something iterable
	  if (typeof obj !== 'object') {
	    /*eslint no-param-reassign:0*/
	    obj = [obj];
	  }

	  if (isArray(obj)) {
	    // Iterate over array values
	    for (i = 0, l = obj.length; i < l; i++) {
	      fn.call(null, obj[i], i, obj);
	    }
	  } else {
	    // Iterate over object keys
	    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
	    const len = keys.length;
	    let key;

	    for (i = 0; i < len; i++) {
	      key = keys[i];
	      fn.call(null, obj[key], key, obj);
	    }
	  }
	}

	function findKey(obj, key) {
	  key = key.toLowerCase();
	  const keys = Object.keys(obj);
	  let i = keys.length;
	  let _key;
	  while (i-- > 0) {
	    _key = keys[i];
	    if (key === _key.toLowerCase()) {
	      return _key;
	    }
	  }
	  return null;
	}

	const _global = (() => {
	  /*eslint no-undef:0*/
	  if (typeof globalThis !== "undefined") return globalThis;
	  return typeof self !== "undefined" ? self : (typeof window !== 'undefined' ? window : global)
	})();

	const isContextDefined = (context) => !isUndefined(context) && context !== _global;

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
	 *
	 * @returns {Object} Result of all merge properties
	 */
	function merge(/* obj1, obj2, obj3, ... */) {
	  const {caseless} = isContextDefined(this) && this || {};
	  const result = {};
	  const assignValue = (val, key) => {
	    const targetKey = caseless && findKey(result, key) || key;
	    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
	      result[targetKey] = merge(result[targetKey], val);
	    } else if (isPlainObject(val)) {
	      result[targetKey] = merge({}, val);
	    } else if (isArray(val)) {
	      result[targetKey] = val.slice();
	    } else {
	      result[targetKey] = val;
	    }
	  };

	  for (let i = 0, l = arguments.length; i < l; i++) {
	    arguments[i] && forEach(arguments[i], assignValue);
	  }
	  return result;
	}

	/**
	 * Extends object a by mutably adding to it the properties of object b.
	 *
	 * @param {Object} a The object to be extended
	 * @param {Object} b The object to copy properties from
	 * @param {Object} thisArg The object to bind function to
	 *
	 * @param {Boolean} [allOwnKeys]
	 * @returns {Object} The resulting value of object a
	 */
	const extend = (a, b, thisArg, {allOwnKeys}= {}) => {
	  forEach(b, (val, key) => {
	    if (thisArg && isFunction(val)) {
	      a[key] = bind(val, thisArg);
	    } else {
	      a[key] = val;
	    }
	  }, {allOwnKeys});
	  return a;
	};

	/**
	 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
	 *
	 * @param {string} content with BOM
	 *
	 * @returns {string} content value without BOM
	 */
	const stripBOM = (content) => {
	  if (content.charCodeAt(0) === 0xFEFF) {
	    content = content.slice(1);
	  }
	  return content;
	};

	/**
	 * Inherit the prototype methods from one constructor into another
	 * @param {function} constructor
	 * @param {function} superConstructor
	 * @param {object} [props]
	 * @param {object} [descriptors]
	 *
	 * @returns {void}
	 */
	const inherits = (constructor, superConstructor, props, descriptors) => {
	  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
	  constructor.prototype.constructor = constructor;
	  Object.defineProperty(constructor, 'super', {
	    value: superConstructor.prototype
	  });
	  props && Object.assign(constructor.prototype, props);
	};

	/**
	 * Resolve object with deep prototype chain to a flat object
	 * @param {Object} sourceObj source object
	 * @param {Object} [destObj]
	 * @param {Function|Boolean} [filter]
	 * @param {Function} [propFilter]
	 *
	 * @returns {Object}
	 */
	const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
	  let props;
	  let i;
	  let prop;
	  const merged = {};

	  destObj = destObj || {};
	  // eslint-disable-next-line no-eq-null,eqeqeq
	  if (sourceObj == null) return destObj;

	  do {
	    props = Object.getOwnPropertyNames(sourceObj);
	    i = props.length;
	    while (i-- > 0) {
	      prop = props[i];
	      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
	        destObj[prop] = sourceObj[prop];
	        merged[prop] = true;
	      }
	    }
	    sourceObj = filter !== false && getPrototypeOf(sourceObj);
	  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

	  return destObj;
	};

	/**
	 * Determines whether a string ends with the characters of a specified string
	 *
	 * @param {String} str
	 * @param {String} searchString
	 * @param {Number} [position= 0]
	 *
	 * @returns {boolean}
	 */
	const endsWith = (str, searchString, position) => {
	  str = String(str);
	  if (position === undefined || position > str.length) {
	    position = str.length;
	  }
	  position -= searchString.length;
	  const lastIndex = str.indexOf(searchString, position);
	  return lastIndex !== -1 && lastIndex === position;
	};


	/**
	 * Returns new array from array like object or null if failed
	 *
	 * @param {*} [thing]
	 *
	 * @returns {?Array}
	 */
	const toArray = (thing) => {
	  if (!thing) return null;
	  if (isArray(thing)) return thing;
	  let i = thing.length;
	  if (!isNumber(i)) return null;
	  const arr = new Array(i);
	  while (i-- > 0) {
	    arr[i] = thing[i];
	  }
	  return arr;
	};

	/**
	 * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
	 * thing passed in is an instance of Uint8Array
	 *
	 * @param {TypedArray}
	 *
	 * @returns {Array}
	 */
	// eslint-disable-next-line func-names
	const isTypedArray = (TypedArray => {
	  // eslint-disable-next-line func-names
	  return thing => {
	    return TypedArray && thing instanceof TypedArray;
	  };
	})(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

	/**
	 * For each entry in the object, call the function with the key and value.
	 *
	 * @param {Object<any, any>} obj - The object to iterate over.
	 * @param {Function} fn - The function to call for each entry.
	 *
	 * @returns {void}
	 */
	const forEachEntry = (obj, fn) => {
	  const generator = obj && obj[Symbol.iterator];

	  const iterator = generator.call(obj);

	  let result;

	  while ((result = iterator.next()) && !result.done) {
	    const pair = result.value;
	    fn.call(obj, pair[0], pair[1]);
	  }
	};

	/**
	 * It takes a regular expression and a string, and returns an array of all the matches
	 *
	 * @param {string} regExp - The regular expression to match against.
	 * @param {string} str - The string to search.
	 *
	 * @returns {Array<boolean>}
	 */
	const matchAll = (regExp, str) => {
	  let matches;
	  const arr = [];

	  while ((matches = regExp.exec(str)) !== null) {
	    arr.push(matches);
	  }

	  return arr;
	};

	/* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
	const isHTMLForm = kindOfTest('HTMLFormElement');

	const toCamelCase = str => {
	  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g,
	    function replacer(m, p1, p2) {
	      return p1.toUpperCase() + p2;
	    }
	  );
	};

	/* Creating a function that will check if an object has a property. */
	const hasOwnProperty = (({hasOwnProperty}) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);

	/**
	 * Determine if a value is a RegExp object
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a RegExp object, otherwise false
	 */
	const isRegExp = kindOfTest('RegExp');

	const reduceDescriptors = (obj, reducer) => {
	  const descriptors = Object.getOwnPropertyDescriptors(obj);
	  const reducedDescriptors = {};

	  forEach(descriptors, (descriptor, name) => {
	    if (reducer(descriptor, name, obj) !== false) {
	      reducedDescriptors[name] = descriptor;
	    }
	  });

	  Object.defineProperties(obj, reducedDescriptors);
	};

	/**
	 * Makes all methods read-only
	 * @param {Object} obj
	 */

	const freezeMethods = (obj) => {
	  reduceDescriptors(obj, (descriptor, name) => {
	    // skip restricted props in strict mode
	    if (isFunction(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
	      return false;
	    }

	    const value = obj[name];

	    if (!isFunction(value)) return;

	    descriptor.enumerable = false;

	    if ('writable' in descriptor) {
	      descriptor.writable = false;
	      return;
	    }

	    if (!descriptor.set) {
	      descriptor.set = () => {
	        throw Error('Can not rewrite read-only method \'' + name + '\'');
	      };
	    }
	  });
	};

	const toObjectSet = (arrayOrString, delimiter) => {
	  const obj = {};

	  const define = (arr) => {
	    arr.forEach(value => {
	      obj[value] = true;
	    });
	  };

	  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));

	  return obj;
	};

	const noop = () => {};

	const toFiniteNumber = (value, defaultValue) => {
	  value = +value;
	  return Number.isFinite(value) ? value : defaultValue;
	};

	const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

	const DIGIT = '0123456789';

	const ALPHABET = {
	  DIGIT,
	  ALPHA,
	  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
	};

	const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
	  let str = '';
	  const {length} = alphabet;
	  while (size--) {
	    str += alphabet[Math.random() * length|0];
	  }

	  return str;
	};

	/**
	 * If the thing is a FormData object, return true, otherwise return false.
	 *
	 * @param {unknown} thing - The thing to check.
	 *
	 * @returns {boolean}
	 */
	function isSpecCompliantForm(thing) {
	  return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
	}

	const toJSONObject = (obj) => {
	  const stack = new Array(10);

	  const visit = (source, i) => {

	    if (isObject(source)) {
	      if (stack.indexOf(source) >= 0) {
	        return;
	      }

	      if(!('toJSON' in source)) {
	        stack[i] = source;
	        const target = isArray(source) ? [] : {};

	        forEach(source, (value, key) => {
	          const reducedValue = visit(value, i + 1);
	          !isUndefined(reducedValue) && (target[key] = reducedValue);
	        });

	        stack[i] = undefined;

	        return target;
	      }
	    }

	    return source;
	  };

	  return visit(obj, 0);
	};

	const isAsyncFn = kindOfTest('AsyncFunction');

	const isThenable = (thing) =>
	  thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);

	var utils = {
	  isArray,
	  isArrayBuffer,
	  isBuffer,
	  isFormData,
	  isArrayBufferView,
	  isString,
	  isNumber,
	  isBoolean,
	  isObject,
	  isPlainObject,
	  isUndefined,
	  isDate,
	  isFile,
	  isBlob,
	  isRegExp,
	  isFunction,
	  isStream,
	  isURLSearchParams,
	  isTypedArray,
	  isFileList,
	  forEach,
	  merge,
	  extend,
	  trim,
	  stripBOM,
	  inherits,
	  toFlatObject,
	  kindOf,
	  kindOfTest,
	  endsWith,
	  toArray,
	  forEachEntry,
	  matchAll,
	  isHTMLForm,
	  hasOwnProperty,
	  hasOwnProp: hasOwnProperty, // an alias to avoid ESLint no-prototype-builtins detection
	  reduceDescriptors,
	  freezeMethods,
	  toObjectSet,
	  toCamelCase,
	  noop,
	  toFiniteNumber,
	  findKey,
	  global: _global,
	  isContextDefined,
	  ALPHABET,
	  generateString,
	  isSpecCompliantForm,
	  toJSONObject,
	  isAsyncFn,
	  isThenable
	};

	/**
	 * Create an Error with the specified message, config, error code, request and response.
	 *
	 * @param {string} message The error message.
	 * @param {string} [code] The error code (for example, 'ECONNABORTED').
	 * @param {Object} [config] The config.
	 * @param {Object} [request] The request.
	 * @param {Object} [response] The response.
	 *
	 * @returns {Error} The created error.
	 */
	function AxiosError(message, code, config, request, response) {
	  Error.call(this);

	  if (Error.captureStackTrace) {
	    Error.captureStackTrace(this, this.constructor);
	  } else {
	    this.stack = (new Error()).stack;
	  }

	  this.message = message;
	  this.name = 'AxiosError';
	  code && (this.code = code);
	  config && (this.config = config);
	  request && (this.request = request);
	  response && (this.response = response);
	}

	utils.inherits(AxiosError, Error, {
	  toJSON: function toJSON() {
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
	      config: utils.toJSONObject(this.config),
	      code: this.code,
	      status: this.response && this.response.status ? this.response.status : null
	    };
	  }
	});

	const prototype$1 = AxiosError.prototype;
	const descriptors = {};

	[
	  'ERR_BAD_OPTION_VALUE',
	  'ERR_BAD_OPTION',
	  'ECONNABORTED',
	  'ETIMEDOUT',
	  'ERR_NETWORK',
	  'ERR_FR_TOO_MANY_REDIRECTS',
	  'ERR_DEPRECATED',
	  'ERR_BAD_RESPONSE',
	  'ERR_BAD_REQUEST',
	  'ERR_CANCELED',
	  'ERR_NOT_SUPPORT',
	  'ERR_INVALID_URL'
	// eslint-disable-next-line func-names
	].forEach(code => {
	  descriptors[code] = {value: code};
	});

	Object.defineProperties(AxiosError, descriptors);
	Object.defineProperty(prototype$1, 'isAxiosError', {value: true});

	// eslint-disable-next-line func-names
	AxiosError.from = (error, code, config, request, response, customProps) => {
	  const axiosError = Object.create(prototype$1);

	  utils.toFlatObject(error, axiosError, function filter(obj) {
	    return obj !== Error.prototype;
	  }, prop => {
	    return prop !== 'isAxiosError';
	  });

	  AxiosError.call(axiosError, error.message, code, config, request, response);

	  axiosError.cause = error;

	  axiosError.name = error.name;

	  customProps && Object.assign(axiosError, customProps);

	  return axiosError;
	};

	// eslint-disable-next-line strict
	var httpAdapter = null;

	/**
	 * Determines if the given thing is a array or js object.
	 *
	 * @param {string} thing - The object or array to be visited.
	 *
	 * @returns {boolean}
	 */
	function isVisitable(thing) {
	  return utils.isPlainObject(thing) || utils.isArray(thing);
	}

	/**
	 * It removes the brackets from the end of a string
	 *
	 * @param {string} key - The key of the parameter.
	 *
	 * @returns {string} the key without the brackets.
	 */
	function removeBrackets(key) {
	  return utils.endsWith(key, '[]') ? key.slice(0, -2) : key;
	}

	/**
	 * It takes a path, a key, and a boolean, and returns a string
	 *
	 * @param {string} path - The path to the current key.
	 * @param {string} key - The key of the current object being iterated over.
	 * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
	 *
	 * @returns {string} The path to the current key.
	 */
	function renderKey(path, key, dots) {
	  if (!path) return key;
	  return path.concat(key).map(function each(token, i) {
	    // eslint-disable-next-line no-param-reassign
	    token = removeBrackets(token);
	    return !dots && i ? '[' + token + ']' : token;
	  }).join(dots ? '.' : '');
	}

	/**
	 * If the array is an array and none of its elements are visitable, then it's a flat array.
	 *
	 * @param {Array<any>} arr - The array to check
	 *
	 * @returns {boolean}
	 */
	function isFlatArray(arr) {
	  return utils.isArray(arr) && !arr.some(isVisitable);
	}

	const predicates = utils.toFlatObject(utils, {}, null, function filter(prop) {
	  return /^is[A-Z]/.test(prop);
	});

	/**
	 * Convert a data object to FormData
	 *
	 * @param {Object} obj
	 * @param {?Object} [formData]
	 * @param {?Object} [options]
	 * @param {Function} [options.visitor]
	 * @param {Boolean} [options.metaTokens = true]
	 * @param {Boolean} [options.dots = false]
	 * @param {?Boolean} [options.indexes = false]
	 *
	 * @returns {Object}
	 **/

	/**
	 * It converts an object into a FormData object
	 *
	 * @param {Object<any, any>} obj - The object to convert to form data.
	 * @param {string} formData - The FormData object to append to.
	 * @param {Object<string, any>} options
	 *
	 * @returns
	 */
	function toFormData(obj, formData, options) {
	  if (!utils.isObject(obj)) {
	    throw new TypeError('target must be an object');
	  }

	  // eslint-disable-next-line no-param-reassign
	  formData = formData || new (FormData)();

	  // eslint-disable-next-line no-param-reassign
	  options = utils.toFlatObject(options, {
	    metaTokens: true,
	    dots: false,
	    indexes: false
	  }, false, function defined(option, source) {
	    // eslint-disable-next-line no-eq-null,eqeqeq
	    return !utils.isUndefined(source[option]);
	  });

	  const metaTokens = options.metaTokens;
	  // eslint-disable-next-line no-use-before-define
	  const visitor = options.visitor || defaultVisitor;
	  const dots = options.dots;
	  const indexes = options.indexes;
	  const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
	  const useBlob = _Blob && utils.isSpecCompliantForm(formData);

	  if (!utils.isFunction(visitor)) {
	    throw new TypeError('visitor must be a function');
	  }

	  function convertValue(value) {
	    if (value === null) return '';

	    if (utils.isDate(value)) {
	      return value.toISOString();
	    }

	    if (!useBlob && utils.isBlob(value)) {
	      throw new AxiosError('Blob is not supported. Use a Buffer instead.');
	    }

	    if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
	      return useBlob && typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
	    }

	    return value;
	  }

	  /**
	   * Default visitor.
	   *
	   * @param {*} value
	   * @param {String|Number} key
	   * @param {Array<String|Number>} path
	   * @this {FormData}
	   *
	   * @returns {boolean} return true to visit the each prop of the value recursively
	   */
	  function defaultVisitor(value, key, path) {
	    let arr = value;

	    if (value && !path && typeof value === 'object') {
	      if (utils.endsWith(key, '{}')) {
	        // eslint-disable-next-line no-param-reassign
	        key = metaTokens ? key : key.slice(0, -2);
	        // eslint-disable-next-line no-param-reassign
	        value = JSON.stringify(value);
	      } else if (
	        (utils.isArray(value) && isFlatArray(value)) ||
	        ((utils.isFileList(value) || utils.endsWith(key, '[]')) && (arr = utils.toArray(value))
	        )) {
	        // eslint-disable-next-line no-param-reassign
	        key = removeBrackets(key);

	        arr.forEach(function each(el, index) {
	          !(utils.isUndefined(el) || el === null) && formData.append(
	            // eslint-disable-next-line no-nested-ternary
	            indexes === true ? renderKey([key], index, dots) : (indexes === null ? key : key + '[]'),
	            convertValue(el)
	          );
	        });
	        return false;
	      }
	    }

	    if (isVisitable(value)) {
	      return true;
	    }

	    formData.append(renderKey(path, key, dots), convertValue(value));

	    return false;
	  }

	  const stack = [];

	  const exposedHelpers = Object.assign(predicates, {
	    defaultVisitor,
	    convertValue,
	    isVisitable
	  });

	  function build(value, path) {
	    if (utils.isUndefined(value)) return;

	    if (stack.indexOf(value) !== -1) {
	      throw Error('Circular reference detected in ' + path.join('.'));
	    }

	    stack.push(value);

	    utils.forEach(value, function each(el, key) {
	      const result = !(utils.isUndefined(el) || el === null) && visitor.call(
	        formData, el, utils.isString(key) ? key.trim() : key, path, exposedHelpers
	      );

	      if (result === true) {
	        build(el, path ? path.concat(key) : [key]);
	      }
	    });

	    stack.pop();
	  }

	  if (!utils.isObject(obj)) {
	    throw new TypeError('data must be an object');
	  }

	  build(obj);

	  return formData;
	}

	/**
	 * It encodes a string by replacing all characters that are not in the unreserved set with
	 * their percent-encoded equivalents
	 *
	 * @param {string} str - The string to encode.
	 *
	 * @returns {string} The encoded string.
	 */
	function encode$1(str) {
	  const charMap = {
	    '!': '%21',
	    "'": '%27',
	    '(': '%28',
	    ')': '%29',
	    '~': '%7E',
	    '%20': '+',
	    '%00': '\x00'
	  };
	  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
	    return charMap[match];
	  });
	}

	/**
	 * It takes a params object and converts it to a FormData object
	 *
	 * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
	 * @param {Object<string, any>} options - The options object passed to the Axios constructor.
	 *
	 * @returns {void}
	 */
	function AxiosURLSearchParams(params, options) {
	  this._pairs = [];

	  params && toFormData(params, this, options);
	}

	const prototype = AxiosURLSearchParams.prototype;

	prototype.append = function append(name, value) {
	  this._pairs.push([name, value]);
	};

	prototype.toString = function toString(encoder) {
	  const _encode = encoder ? function(value) {
	    return encoder.call(this, value, encode$1);
	  } : encode$1;

	  return this._pairs.map(function each(pair) {
	    return _encode(pair[0]) + '=' + _encode(pair[1]);
	  }, '').join('&');
	};

	/**
	 * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
	 * URI encoded counterparts
	 *
	 * @param {string} val The value to be encoded.
	 *
	 * @returns {string} The encoded value.
	 */
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
	 * @param {?object} options
	 *
	 * @returns {string} The formatted url
	 */
	function buildURL(url, params, options) {
	  /*eslint no-param-reassign:0*/
	  if (!params) {
	    return url;
	  }
	  
	  const _encode = options && options.encode || encode;

	  const serializeFn = options && options.serialize;

	  let serializedParams;

	  if (serializeFn) {
	    serializedParams = serializeFn(params, options);
	  } else {
	    serializedParams = utils.isURLSearchParams(params) ?
	      params.toString() :
	      new AxiosURLSearchParams(params, options).toString(_encode);
	  }

	  if (serializedParams) {
	    const hashmarkIndex = url.indexOf("#");

	    if (hashmarkIndex !== -1) {
	      url = url.slice(0, hashmarkIndex);
	    }
	    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
	  }

	  return url;
	}

	class InterceptorManager {
	  constructor() {
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
	  use(fulfilled, rejected, options) {
	    this.handlers.push({
	      fulfilled,
	      rejected,
	      synchronous: options ? options.synchronous : false,
	      runWhen: options ? options.runWhen : null
	    });
	    return this.handlers.length - 1;
	  }

	  /**
	   * Remove an interceptor from the stack
	   *
	   * @param {Number} id The ID that was returned by `use`
	   *
	   * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
	   */
	  eject(id) {
	    if (this.handlers[id]) {
	      this.handlers[id] = null;
	    }
	  }

	  /**
	   * Clear all interceptors from the stack
	   *
	   * @returns {void}
	   */
	  clear() {
	    if (this.handlers) {
	      this.handlers = [];
	    }
	  }

	  /**
	   * Iterate over all the registered interceptors
	   *
	   * This method is particularly useful for skipping over any
	   * interceptors that may have become `null` calling `eject`.
	   *
	   * @param {Function} fn The function to call for each interceptor
	   *
	   * @returns {void}
	   */
	  forEach(fn) {
	    utils.forEach(this.handlers, function forEachHandler(h) {
	      if (h !== null) {
	        fn(h);
	      }
	    });
	  }
	}

	var InterceptorManager$1 = InterceptorManager;

	var transitionalDefaults = {
	  silentJSONParsing: true,
	  forcedJSONParsing: true,
	  clarifyTimeoutError: false
	};

	var URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

	var FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

	var Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

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
	 *
	 * @returns {boolean}
	 */
	const isStandardBrowserEnv = (() => {
	  let product;
	  if (typeof navigator !== 'undefined' && (
	    (product = navigator.product) === 'ReactNative' ||
	    product === 'NativeScript' ||
	    product === 'NS')
	  ) {
	    return false;
	  }

	  return typeof window !== 'undefined' && typeof document !== 'undefined';
	})();

	/**
	 * Determine if we're running in a standard browser webWorker environment
	 *
	 * Although the `isStandardBrowserEnv` method indicates that
	 * `allows axios to run in a web worker`, the WebWorker will still be
	 * filtered out due to its judgment standard
	 * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
	 * This leads to a problem when axios post `FormData` in webWorker
	 */
	 const isStandardBrowserWebWorkerEnv = (() => {
	  return (
	    typeof WorkerGlobalScope !== 'undefined' &&
	    // eslint-disable-next-line no-undef
	    self instanceof WorkerGlobalScope &&
	    typeof self.importScripts === 'function'
	  );
	})();


	var platform = {
	  isBrowser: true,
	  classes: {
	    URLSearchParams: URLSearchParams$1,
	    FormData: FormData$1,
	    Blob: Blob$1
	  },
	  isStandardBrowserEnv,
	  isStandardBrowserWebWorkerEnv,
	  protocols: ['http', 'https', 'file', 'blob', 'url', 'data']
	};

	function toURLEncodedForm(data, options) {
	  return toFormData(data, new platform.classes.URLSearchParams(), Object.assign({
	    visitor: function(value, key, path, helpers) {
	      if (platform.isNode && utils.isBuffer(value)) {
	        this.append(key, value.toString('base64'));
	        return false;
	      }

	      return helpers.defaultVisitor.apply(this, arguments);
	    }
	  }, options));
	}

	/**
	 * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
	 *
	 * @param {string} name - The name of the property to get.
	 *
	 * @returns An array of strings.
	 */
	function parsePropPath(name) {
	  // foo[x][y][z]
	  // foo.x.y.z
	  // foo-x-y-z
	  // foo x y z
	  return utils.matchAll(/\w+|\[(\w*)]/g, name).map(match => {
	    return match[0] === '[]' ? '' : match[1] || match[0];
	  });
	}

	/**
	 * Convert an array to an object.
	 *
	 * @param {Array<any>} arr - The array to convert to an object.
	 *
	 * @returns An object with the same keys and values as the array.
	 */
	function arrayToObject(arr) {
	  const obj = {};
	  const keys = Object.keys(arr);
	  let i;
	  const len = keys.length;
	  let key;
	  for (i = 0; i < len; i++) {
	    key = keys[i];
	    obj[key] = arr[key];
	  }
	  return obj;
	}

	/**
	 * It takes a FormData object and returns a JavaScript object
	 *
	 * @param {string} formData The FormData object to convert to JSON.
	 *
	 * @returns {Object<string, any> | null} The converted object.
	 */
	function formDataToJSON(formData) {
	  function buildPath(path, value, target, index) {
	    let name = path[index++];
	    const isNumericKey = Number.isFinite(+name);
	    const isLast = index >= path.length;
	    name = !name && utils.isArray(target) ? target.length : name;

	    if (isLast) {
	      if (utils.hasOwnProp(target, name)) {
	        target[name] = [target[name], value];
	      } else {
	        target[name] = value;
	      }

	      return !isNumericKey;
	    }

	    if (!target[name] || !utils.isObject(target[name])) {
	      target[name] = [];
	    }

	    const result = buildPath(path, value, target[name], index);

	    if (result && utils.isArray(target[name])) {
	      target[name] = arrayToObject(target[name]);
	    }

	    return !isNumericKey;
	  }

	  if (utils.isFormData(formData) && utils.isFunction(formData.entries)) {
	    const obj = {};

	    utils.forEachEntry(formData, (name, value) => {
	      buildPath(parsePropPath(name), value, obj, 0);
	    });

	    return obj;
	  }

	  return null;
	}

	const DEFAULT_CONTENT_TYPE = {
	  'Content-Type': undefined
	};

	/**
	 * It takes a string, tries to parse it, and if it fails, it returns the stringified version
	 * of the input
	 *
	 * @param {any} rawValue - The value to be stringified.
	 * @param {Function} parser - A function that parses a string into a JavaScript object.
	 * @param {Function} encoder - A function that takes a value and returns a string.
	 *
	 * @returns {string} A stringified version of the rawValue.
	 */
	function stringifySafely(rawValue, parser, encoder) {
	  if (utils.isString(rawValue)) {
	    try {
	      (parser || JSON.parse)(rawValue);
	      return utils.trim(rawValue);
	    } catch (e) {
	      if (e.name !== 'SyntaxError') {
	        throw e;
	      }
	    }
	  }

	  return (encoder || JSON.stringify)(rawValue);
	}

	const defaults = {

	  transitional: transitionalDefaults,

	  adapter: ['xhr', 'http'],

	  transformRequest: [function transformRequest(data, headers) {
	    const contentType = headers.getContentType() || '';
	    const hasJSONContentType = contentType.indexOf('application/json') > -1;
	    const isObjectPayload = utils.isObject(data);

	    if (isObjectPayload && utils.isHTMLForm(data)) {
	      data = new FormData(data);
	    }

	    const isFormData = utils.isFormData(data);

	    if (isFormData) {
	      if (!hasJSONContentType) {
	        return data;
	      }
	      return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
	    }

	    if (utils.isArrayBuffer(data) ||
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
	      headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
	      return data.toString();
	    }

	    let isFileList;

	    if (isObjectPayload) {
	      if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
	        return toURLEncodedForm(data, this.formSerializer).toString();
	      }

	      if ((isFileList = utils.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
	        const _FormData = this.env && this.env.FormData;

	        return toFormData(
	          isFileList ? {'files[]': data} : data,
	          _FormData && new _FormData(),
	          this.formSerializer
	        );
	      }
	    }

	    if (isObjectPayload || hasJSONContentType ) {
	      headers.setContentType('application/json', false);
	      return stringifySafely(data);
	    }

	    return data;
	  }],

	  transformResponse: [function transformResponse(data) {
	    const transitional = this.transitional || defaults.transitional;
	    const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
	    const JSONRequested = this.responseType === 'json';

	    if (data && utils.isString(data) && ((forcedJSONParsing && !this.responseType) || JSONRequested)) {
	      const silentJSONParsing = transitional && transitional.silentJSONParsing;
	      const strictJSONParsing = !silentJSONParsing && JSONRequested;

	      try {
	        return JSON.parse(data);
	      } catch (e) {
	        if (strictJSONParsing) {
	          if (e.name === 'SyntaxError') {
	            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
	          }
	          throw e;
	        }
	      }
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

	  env: {
	    FormData: platform.classes.FormData,
	    Blob: platform.classes.Blob
	  },

	  validateStatus: function validateStatus(status) {
	    return status >= 200 && status < 300;
	  },

	  headers: {
	    common: {
	      'Accept': 'application/json, text/plain, */*'
	    }
	  }
	};

	utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
	  defaults.headers[method] = {};
	});

	utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
	  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
	});

	var defaults$1 = defaults;

	// RawAxiosHeaders whose duplicates are ignored by node
	// c.f. https://nodejs.org/api/http.html#http_message_headers
	const ignoreDuplicateOf = utils.toObjectSet([
	  'age', 'authorization', 'content-length', 'content-type', 'etag',
	  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
	  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
	  'referer', 'retry-after', 'user-agent'
	]);

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
	 * @param {String} rawHeaders Headers needing to be parsed
	 *
	 * @returns {Object} Headers parsed into an object
	 */
	var parseHeaders = rawHeaders => {
	  const parsed = {};
	  let key;
	  let val;
	  let i;

	  rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
	    i = line.indexOf(':');
	    key = line.substring(0, i).trim().toLowerCase();
	    val = line.substring(i + 1).trim();

	    if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
	      return;
	    }

	    if (key === 'set-cookie') {
	      if (parsed[key]) {
	        parsed[key].push(val);
	      } else {
	        parsed[key] = [val];
	      }
	    } else {
	      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
	    }
	  });

	  return parsed;
	};

	const $internals = Symbol('internals');

	function normalizeHeader(header) {
	  return header && String(header).trim().toLowerCase();
	}

	function normalizeValue(value) {
	  if (value === false || value == null) {
	    return value;
	  }

	  return utils.isArray(value) ? value.map(normalizeValue) : String(value);
	}

	function parseTokens(str) {
	  const tokens = Object.create(null);
	  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
	  let match;

	  while ((match = tokensRE.exec(str))) {
	    tokens[match[1]] = match[2];
	  }

	  return tokens;
	}

	const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

	function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
	  if (utils.isFunction(filter)) {
	    return filter.call(this, value, header);
	  }

	  if (isHeaderNameFilter) {
	    value = header;
	  }

	  if (!utils.isString(value)) return;

	  if (utils.isString(filter)) {
	    return value.indexOf(filter) !== -1;
	  }

	  if (utils.isRegExp(filter)) {
	    return filter.test(value);
	  }
	}

	function formatHeader(header) {
	  return header.trim()
	    .toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
	      return char.toUpperCase() + str;
	    });
	}

	function buildAccessors(obj, header) {
	  const accessorName = utils.toCamelCase(' ' + header);

	  ['get', 'set', 'has'].forEach(methodName => {
	    Object.defineProperty(obj, methodName + accessorName, {
	      value: function(arg1, arg2, arg3) {
	        return this[methodName].call(this, header, arg1, arg2, arg3);
	      },
	      configurable: true
	    });
	  });
	}

	class AxiosHeaders {
	  constructor(headers) {
	    headers && this.set(headers);
	  }

	  set(header, valueOrRewrite, rewrite) {
	    const self = this;

	    function setHeader(_value, _header, _rewrite) {
	      const lHeader = normalizeHeader(_header);

	      if (!lHeader) {
	        throw new Error('header name must be a non-empty string');
	      }

	      const key = utils.findKey(self, lHeader);

	      if(!key || self[key] === undefined || _rewrite === true || (_rewrite === undefined && self[key] !== false)) {
	        self[key || _header] = normalizeValue(_value);
	      }
	    }

	    const setHeaders = (headers, _rewrite) =>
	      utils.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

	    if (utils.isPlainObject(header) || header instanceof this.constructor) {
	      setHeaders(header, valueOrRewrite);
	    } else if(utils.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
	      setHeaders(parseHeaders(header), valueOrRewrite);
	    } else {
	      header != null && setHeader(valueOrRewrite, header, rewrite);
	    }

	    return this;
	  }

	  get(header, parser) {
	    header = normalizeHeader(header);

	    if (header) {
	      const key = utils.findKey(this, header);

	      if (key) {
	        const value = this[key];

	        if (!parser) {
	          return value;
	        }

	        if (parser === true) {
	          return parseTokens(value);
	        }

	        if (utils.isFunction(parser)) {
	          return parser.call(this, value, key);
	        }

	        if (utils.isRegExp(parser)) {
	          return parser.exec(value);
	        }

	        throw new TypeError('parser must be boolean|regexp|function');
	      }
	    }
	  }

	  has(header, matcher) {
	    header = normalizeHeader(header);

	    if (header) {
	      const key = utils.findKey(this, header);

	      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
	    }

	    return false;
	  }

	  delete(header, matcher) {
	    const self = this;
	    let deleted = false;

	    function deleteHeader(_header) {
	      _header = normalizeHeader(_header);

	      if (_header) {
	        const key = utils.findKey(self, _header);

	        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
	          delete self[key];

	          deleted = true;
	        }
	      }
	    }

	    if (utils.isArray(header)) {
	      header.forEach(deleteHeader);
	    } else {
	      deleteHeader(header);
	    }

	    return deleted;
	  }

	  clear(matcher) {
	    const keys = Object.keys(this);
	    let i = keys.length;
	    let deleted = false;

	    while (i--) {
	      const key = keys[i];
	      if(!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
	        delete this[key];
	        deleted = true;
	      }
	    }

	    return deleted;
	  }

	  normalize(format) {
	    const self = this;
	    const headers = {};

	    utils.forEach(this, (value, header) => {
	      const key = utils.findKey(headers, header);

	      if (key) {
	        self[key] = normalizeValue(value);
	        delete self[header];
	        return;
	      }

	      const normalized = format ? formatHeader(header) : String(header).trim();

	      if (normalized !== header) {
	        delete self[header];
	      }

	      self[normalized] = normalizeValue(value);

	      headers[normalized] = true;
	    });

	    return this;
	  }

	  concat(...targets) {
	    return this.constructor.concat(this, ...targets);
	  }

	  toJSON(asStrings) {
	    const obj = Object.create(null);

	    utils.forEach(this, (value, header) => {
	      value != null && value !== false && (obj[header] = asStrings && utils.isArray(value) ? value.join(', ') : value);
	    });

	    return obj;
	  }

	  [Symbol.iterator]() {
	    return Object.entries(this.toJSON())[Symbol.iterator]();
	  }

	  toString() {
	    return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
	  }

	  get [Symbol.toStringTag]() {
	    return 'AxiosHeaders';
	  }

	  static from(thing) {
	    return thing instanceof this ? thing : new this(thing);
	  }

	  static concat(first, ...targets) {
	    const computed = new this(first);

	    targets.forEach((target) => computed.set(target));

	    return computed;
	  }

	  static accessor(header) {
	    const internals = this[$internals] = (this[$internals] = {
	      accessors: {}
	    });

	    const accessors = internals.accessors;
	    const prototype = this.prototype;

	    function defineAccessor(_header) {
	      const lHeader = normalizeHeader(_header);

	      if (!accessors[lHeader]) {
	        buildAccessors(prototype, _header);
	        accessors[lHeader] = true;
	      }
	    }

	    utils.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

	    return this;
	  }
	}

	AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);

	utils.freezeMethods(AxiosHeaders.prototype);
	utils.freezeMethods(AxiosHeaders);

	var AxiosHeaders$1 = AxiosHeaders;

	/**
	 * Transform the data for a request or a response
	 *
	 * @param {Array|Function} fns A single function or Array of functions
	 * @param {?Object} response The response object
	 *
	 * @returns {*} The resulting transformed data
	 */
	function transformData(fns, response) {
	  const config = this || defaults$1;
	  const context = response || config;
	  const headers = AxiosHeaders$1.from(context.headers);
	  let data = context.data;

	  utils.forEach(fns, function transform(fn) {
	    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
	  });

	  headers.normalize();

	  return data;
	}

	function isCancel(value) {
	  return !!(value && value.__CANCEL__);
	}

	/**
	 * A `CanceledError` is an object that is thrown when an operation is canceled.
	 *
	 * @param {string=} message The message.
	 * @param {Object=} config The config.
	 * @param {Object=} request The request.
	 *
	 * @returns {CanceledError} The created error.
	 */
	function CanceledError(message, config, request) {
	  // eslint-disable-next-line no-eq-null,eqeqeq
	  AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
	  this.name = 'CanceledError';
	}

	utils.inherits(CanceledError, AxiosError, {
	  __CANCEL__: true
	});

	/**
	 * Resolve or reject a Promise based on response status.
	 *
	 * @param {Function} resolve A function that resolves the promise.
	 * @param {Function} reject A function that rejects the promise.
	 * @param {object} response The response.
	 *
	 * @returns {object} The response.
	 */
	function settle(resolve, reject, response) {
	  const validateStatus = response.config.validateStatus;
	  if (!response.status || !validateStatus || validateStatus(response.status)) {
	    resolve(response);
	  } else {
	    reject(new AxiosError(
	      'Request failed with status code ' + response.status,
	      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
	      response.config,
	      response.request,
	      response
	    ));
	  }
	}

	var cookies = platform.isStandardBrowserEnv ?

	// Standard browser envs support document.cookie
	  (function standardBrowserEnv() {
	    return {
	      write: function write(name, value, expires, path, domain, secure) {
	        const cookie = [];
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
	        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
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
	  })();

	/**
	 * Determines whether the specified URL is absolute
	 *
	 * @param {string} url The URL to test
	 *
	 * @returns {boolean} True if the specified URL is absolute, otherwise false
	 */
	function isAbsoluteURL(url) {
	  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
	  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
	  // by any combination of letters, digits, plus, period, or hyphen.
	  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
	}

	/**
	 * Creates a new URL by combining the specified URLs
	 *
	 * @param {string} baseURL The base URL
	 * @param {string} relativeURL The relative URL
	 *
	 * @returns {string} The combined URL
	 */
	function combineURLs(baseURL, relativeURL) {
	  return relativeURL
	    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
	    : baseURL;
	}

	/**
	 * Creates a new URL by combining the baseURL with the requestedURL,
	 * only when the requestedURL is not already an absolute URL.
	 * If the requestURL is absolute, this function returns the requestedURL untouched.
	 *
	 * @param {string} baseURL The base URL
	 * @param {string} requestedURL Absolute or relative URL to combine
	 *
	 * @returns {string} The combined full path
	 */
	function buildFullPath(baseURL, requestedURL) {
	  if (baseURL && !isAbsoluteURL(requestedURL)) {
	    return combineURLs(baseURL, requestedURL);
	  }
	  return requestedURL;
	}

	var isURLSameOrigin = platform.isStandardBrowserEnv ?

	// Standard browser envs have full support of the APIs needed to test
	// whether the request URL is of the same origin as current location.
	  (function standardBrowserEnv() {
	    const msie = /(msie|trident)/i.test(navigator.userAgent);
	    const urlParsingNode = document.createElement('a');
	    let originURL;

	    /**
	    * Parse a URL to discover it's components
	    *
	    * @param {String} url The URL to be parsed
	    * @returns {Object}
	    */
	    function resolveURL(url) {
	      let href = url;

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
	      const parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
	      return (parsed.protocol === originURL.protocol &&
	          parsed.host === originURL.host);
	    };
	  })() :

	  // Non standard browser envs (web workers, react-native) lack needed support.
	  (function nonStandardBrowserEnv() {
	    return function isURLSameOrigin() {
	      return true;
	    };
	  })();

	function parseProtocol(url) {
	  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
	  return match && match[1] || '';
	}

	/**
	 * Calculate data maxRate
	 * @param {Number} [samplesCount= 10]
	 * @param {Number} [min= 1000]
	 * @returns {Function}
	 */
	function speedometer(samplesCount, min) {
	  samplesCount = samplesCount || 10;
	  const bytes = new Array(samplesCount);
	  const timestamps = new Array(samplesCount);
	  let head = 0;
	  let tail = 0;
	  let firstSampleTS;

	  min = min !== undefined ? min : 1000;

	  return function push(chunkLength) {
	    const now = Date.now();

	    const startedAt = timestamps[tail];

	    if (!firstSampleTS) {
	      firstSampleTS = now;
	    }

	    bytes[head] = chunkLength;
	    timestamps[head] = now;

	    let i = tail;
	    let bytesCount = 0;

	    while (i !== head) {
	      bytesCount += bytes[i++];
	      i = i % samplesCount;
	    }

	    head = (head + 1) % samplesCount;

	    if (head === tail) {
	      tail = (tail + 1) % samplesCount;
	    }

	    if (now - firstSampleTS < min) {
	      return;
	    }

	    const passed = startedAt && now - startedAt;

	    return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
	  };
	}

	function progressEventReducer(listener, isDownloadStream) {
	  let bytesNotified = 0;
	  const _speedometer = speedometer(50, 250);

	  return e => {
	    const loaded = e.loaded;
	    const total = e.lengthComputable ? e.total : undefined;
	    const progressBytes = loaded - bytesNotified;
	    const rate = _speedometer(progressBytes);
	    const inRange = loaded <= total;

	    bytesNotified = loaded;

	    const data = {
	      loaded,
	      total,
	      progress: total ? (loaded / total) : undefined,
	      bytes: progressBytes,
	      rate: rate ? rate : undefined,
	      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
	      event: e
	    };

	    data[isDownloadStream ? 'download' : 'upload'] = true;

	    listener(data);
	  };
	}

	const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

	var xhrAdapter = isXHRAdapterSupported && function (config) {
	  return new Promise(function dispatchXhrRequest(resolve, reject) {
	    let requestData = config.data;
	    const requestHeaders = AxiosHeaders$1.from(config.headers).normalize();
	    const responseType = config.responseType;
	    let onCanceled;
	    function done() {
	      if (config.cancelToken) {
	        config.cancelToken.unsubscribe(onCanceled);
	      }

	      if (config.signal) {
	        config.signal.removeEventListener('abort', onCanceled);
	      }
	    }

	    if (utils.isFormData(requestData)) {
	      if (platform.isStandardBrowserEnv || platform.isStandardBrowserWebWorkerEnv) {
	        requestHeaders.setContentType(false); // Let the browser set it
	      } else {
	        requestHeaders.setContentType('multipart/form-data;', false); // mobile/desktop app frameworks
	      }
	    }

	    let request = new XMLHttpRequest();

	    // HTTP basic authentication
	    if (config.auth) {
	      const username = config.auth.username || '';
	      const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
	      requestHeaders.set('Authorization', 'Basic ' + btoa(username + ':' + password));
	    }

	    const fullPath = buildFullPath(config.baseURL, config.url);

	    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

	    // Set the request timeout in MS
	    request.timeout = config.timeout;

	    function onloadend() {
	      if (!request) {
	        return;
	      }
	      // Prepare the response
	      const responseHeaders = AxiosHeaders$1.from(
	        'getAllResponseHeaders' in request && request.getAllResponseHeaders()
	      );
	      const responseData = !responseType || responseType === 'text' || responseType === 'json' ?
	        request.responseText : request.response;
	      const response = {
	        data: responseData,
	        status: request.status,
	        statusText: request.statusText,
	        headers: responseHeaders,
	        config,
	        request
	      };

	      settle(function _resolve(value) {
	        resolve(value);
	        done();
	      }, function _reject(err) {
	        reject(err);
	        done();
	      }, response);

	      // Clean up request
	      request = null;
	    }

	    if ('onloadend' in request) {
	      // Use onloadend if available
	      request.onloadend = onloadend;
	    } else {
	      // Listen for ready state to emulate onloadend
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
	        // readystate handler is calling before onerror or ontimeout handlers,
	        // so we should call onloadend on the next 'tick'
	        setTimeout(onloadend);
	      };
	    }

	    // Handle browser request cancellation (as opposed to a manual cancellation)
	    request.onabort = function handleAbort() {
	      if (!request) {
	        return;
	      }

	      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

	      // Clean up request
	      request = null;
	    };

	    // Handle low level network errors
	    request.onerror = function handleError() {
	      // Real errors are hidden from us by the browser
	      // onerror should only fire if it's a network error
	      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request));

	      // Clean up request
	      request = null;
	    };

	    // Handle timeout
	    request.ontimeout = function handleTimeout() {
	      let timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
	      const transitional = config.transitional || transitionalDefaults;
	      if (config.timeoutErrorMessage) {
	        timeoutErrorMessage = config.timeoutErrorMessage;
	      }
	      reject(new AxiosError(
	        timeoutErrorMessage,
	        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
	        config,
	        request));

	      // Clean up request
	      request = null;
	    };

	    // Add xsrf header
	    // This is only done if running in a standard browser environment.
	    // Specifically not if we're in a web worker, or react-native.
	    if (platform.isStandardBrowserEnv) {
	      // Add xsrf header
	      const xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath))
	        && config.xsrfCookieName && cookies.read(config.xsrfCookieName);

	      if (xsrfValue) {
	        requestHeaders.set(config.xsrfHeaderName, xsrfValue);
	      }
	    }

	    // Remove Content-Type if data is undefined
	    requestData === undefined && requestHeaders.setContentType(null);

	    // Add headers to the request
	    if ('setRequestHeader' in request) {
	      utils.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
	        request.setRequestHeader(key, val);
	      });
	    }

	    // Add withCredentials to request if needed
	    if (!utils.isUndefined(config.withCredentials)) {
	      request.withCredentials = !!config.withCredentials;
	    }

	    // Add responseType to request if needed
	    if (responseType && responseType !== 'json') {
	      request.responseType = config.responseType;
	    }

	    // Handle progress if needed
	    if (typeof config.onDownloadProgress === 'function') {
	      request.addEventListener('progress', progressEventReducer(config.onDownloadProgress, true));
	    }

	    // Not all browsers support upload events
	    if (typeof config.onUploadProgress === 'function' && request.upload) {
	      request.upload.addEventListener('progress', progressEventReducer(config.onUploadProgress));
	    }

	    if (config.cancelToken || config.signal) {
	      // Handle cancellation
	      // eslint-disable-next-line func-names
	      onCanceled = cancel => {
	        if (!request) {
	          return;
	        }
	        reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
	        request.abort();
	        request = null;
	      };

	      config.cancelToken && config.cancelToken.subscribe(onCanceled);
	      if (config.signal) {
	        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
	      }
	    }

	    const protocol = parseProtocol(fullPath);

	    if (protocol && platform.protocols.indexOf(protocol) === -1) {
	      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
	      return;
	    }


	    // Send the request
	    request.send(requestData || null);
	  });
	};

	const knownAdapters = {
	  http: httpAdapter,
	  xhr: xhrAdapter
	};

	utils.forEach(knownAdapters, (fn, value) => {
	  if(fn) {
	    try {
	      Object.defineProperty(fn, 'name', {value});
	    } catch (e) {
	      // eslint-disable-next-line no-empty
	    }
	    Object.defineProperty(fn, 'adapterName', {value});
	  }
	});

	var adapters = {
	  getAdapter: (adapters) => {
	    adapters = utils.isArray(adapters) ? adapters : [adapters];

	    const {length} = adapters;
	    let nameOrAdapter;
	    let adapter;

	    for (let i = 0; i < length; i++) {
	      nameOrAdapter = adapters[i];
	      if((adapter = utils.isString(nameOrAdapter) ? knownAdapters[nameOrAdapter.toLowerCase()] : nameOrAdapter)) {
	        break;
	      }
	    }

	    if (!adapter) {
	      if (adapter === false) {
	        throw new AxiosError(
	          `Adapter ${nameOrAdapter} is not supported by the environment`,
	          'ERR_NOT_SUPPORT'
	        );
	      }

	      throw new Error(
	        utils.hasOwnProp(knownAdapters, nameOrAdapter) ?
	          `Adapter '${nameOrAdapter}' is not available in the build` :
	          `Unknown adapter '${nameOrAdapter}'`
	      );
	    }

	    if (!utils.isFunction(adapter)) {
	      throw new TypeError('adapter is not a function');
	    }

	    return adapter;
	  },
	  adapters: knownAdapters
	};

	/**
	 * Throws a `CanceledError` if cancellation has been requested.
	 *
	 * @param {Object} config The config that is to be used for the request
	 *
	 * @returns {void}
	 */
	function throwIfCancellationRequested(config) {
	  if (config.cancelToken) {
	    config.cancelToken.throwIfRequested();
	  }

	  if (config.signal && config.signal.aborted) {
	    throw new CanceledError(null, config);
	  }
	}

	/**
	 * Dispatch a request to the server using the configured adapter.
	 *
	 * @param {object} config The config that is to be used for the request
	 *
	 * @returns {Promise} The Promise to be fulfilled
	 */
	function dispatchRequest(config) {
	  throwIfCancellationRequested(config);

	  config.headers = AxiosHeaders$1.from(config.headers);

	  // Transform request data
	  config.data = transformData.call(
	    config,
	    config.transformRequest
	  );

	  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
	    config.headers.setContentType('application/x-www-form-urlencoded', false);
	  }

	  const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter);

	  return adapter(config).then(function onAdapterResolution(response) {
	    throwIfCancellationRequested(config);

	    // Transform response data
	    response.data = transformData.call(
	      config,
	      config.transformResponse,
	      response
	    );

	    response.headers = AxiosHeaders$1.from(response.headers);

	    return response;
	  }, function onAdapterRejection(reason) {
	    if (!isCancel(reason)) {
	      throwIfCancellationRequested(config);

	      // Transform response data
	      if (reason && reason.response) {
	        reason.response.data = transformData.call(
	          config,
	          config.transformResponse,
	          reason.response
	        );
	        reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
	      }
	    }

	    return Promise.reject(reason);
	  });
	}

	const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? thing.toJSON() : thing;

	/**
	 * Config-specific merge-function which creates a new config-object
	 * by merging two configuration objects together.
	 *
	 * @param {Object} config1
	 * @param {Object} config2
	 *
	 * @returns {Object} New object resulting from merging config2 to config1
	 */
	function mergeConfig(config1, config2) {
	  // eslint-disable-next-line no-param-reassign
	  config2 = config2 || {};
	  const config = {};

	  function getMergedValue(target, source, caseless) {
	    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
	      return utils.merge.call({caseless}, target, source);
	    } else if (utils.isPlainObject(source)) {
	      return utils.merge({}, source);
	    } else if (utils.isArray(source)) {
	      return source.slice();
	    }
	    return source;
	  }

	  // eslint-disable-next-line consistent-return
	  function mergeDeepProperties(a, b, caseless) {
	    if (!utils.isUndefined(b)) {
	      return getMergedValue(a, b, caseless);
	    } else if (!utils.isUndefined(a)) {
	      return getMergedValue(undefined, a, caseless);
	    }
	  }

	  // eslint-disable-next-line consistent-return
	  function valueFromConfig2(a, b) {
	    if (!utils.isUndefined(b)) {
	      return getMergedValue(undefined, b);
	    }
	  }

	  // eslint-disable-next-line consistent-return
	  function defaultToConfig2(a, b) {
	    if (!utils.isUndefined(b)) {
	      return getMergedValue(undefined, b);
	    } else if (!utils.isUndefined(a)) {
	      return getMergedValue(undefined, a);
	    }
	  }

	  // eslint-disable-next-line consistent-return
	  function mergeDirectKeys(a, b, prop) {
	    if (prop in config2) {
	      return getMergedValue(a, b);
	    } else if (prop in config1) {
	      return getMergedValue(undefined, a);
	    }
	  }

	  const mergeMap = {
	    url: valueFromConfig2,
	    method: valueFromConfig2,
	    data: valueFromConfig2,
	    baseURL: defaultToConfig2,
	    transformRequest: defaultToConfig2,
	    transformResponse: defaultToConfig2,
	    paramsSerializer: defaultToConfig2,
	    timeout: defaultToConfig2,
	    timeoutMessage: defaultToConfig2,
	    withCredentials: defaultToConfig2,
	    adapter: defaultToConfig2,
	    responseType: defaultToConfig2,
	    xsrfCookieName: defaultToConfig2,
	    xsrfHeaderName: defaultToConfig2,
	    onUploadProgress: defaultToConfig2,
	    onDownloadProgress: defaultToConfig2,
	    decompress: defaultToConfig2,
	    maxContentLength: defaultToConfig2,
	    maxBodyLength: defaultToConfig2,
	    beforeRedirect: defaultToConfig2,
	    transport: defaultToConfig2,
	    httpAgent: defaultToConfig2,
	    httpsAgent: defaultToConfig2,
	    cancelToken: defaultToConfig2,
	    socketPath: defaultToConfig2,
	    responseEncoding: defaultToConfig2,
	    validateStatus: mergeDirectKeys,
	    headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true)
	  };

	  utils.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
	    const merge = mergeMap[prop] || mergeDeepProperties;
	    const configValue = merge(config1[prop], config2[prop], prop);
	    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
	  });

	  return config;
	}

	const VERSION = "1.4.0";

	const validators$1 = {};

	// eslint-disable-next-line func-names
	['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
	  validators$1[type] = function validator(thing) {
	    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
	  };
	});

	const deprecatedWarnings = {};

	/**
	 * Transitional option validator
	 *
	 * @param {function|boolean?} validator - set to false if the transitional option has been removed
	 * @param {string?} version - deprecated version / removed since version
	 * @param {string?} message - some message with additional info
	 *
	 * @returns {function}
	 */
	validators$1.transitional = function transitional(validator, version, message) {
	  function formatMessage(opt, desc) {
	    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
	  }

	  // eslint-disable-next-line func-names
	  return (value, opt, opts) => {
	    if (validator === false) {
	      throw new AxiosError(
	        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
	        AxiosError.ERR_DEPRECATED
	      );
	    }

	    if (version && !deprecatedWarnings[opt]) {
	      deprecatedWarnings[opt] = true;
	      // eslint-disable-next-line no-console
	      console.warn(
	        formatMessage(
	          opt,
	          ' has been deprecated since v' + version + ' and will be removed in the near future'
	        )
	      );
	    }

	    return validator ? validator(value, opt, opts) : true;
	  };
	};

	/**
	 * Assert object's properties type
	 *
	 * @param {object} options
	 * @param {object} schema
	 * @param {boolean?} allowUnknown
	 *
	 * @returns {object}
	 */

	function assertOptions(options, schema, allowUnknown) {
	  if (typeof options !== 'object') {
	    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
	  }
	  const keys = Object.keys(options);
	  let i = keys.length;
	  while (i-- > 0) {
	    const opt = keys[i];
	    const validator = schema[opt];
	    if (validator) {
	      const value = options[opt];
	      const result = value === undefined || validator(value, opt, options);
	      if (result !== true) {
	        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
	      }
	      continue;
	    }
	    if (allowUnknown !== true) {
	      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
	    }
	  }
	}

	var validator = {
	  assertOptions,
	  validators: validators$1
	};

	const validators = validator.validators;

	/**
	 * Create a new instance of Axios
	 *
	 * @param {Object} instanceConfig The default config for the instance
	 *
	 * @return {Axios} A new instance of Axios
	 */
	class Axios {
	  constructor(instanceConfig) {
	    this.defaults = instanceConfig;
	    this.interceptors = {
	      request: new InterceptorManager$1(),
	      response: new InterceptorManager$1()
	    };
	  }

	  /**
	   * Dispatch a request
	   *
	   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
	   * @param {?Object} config
	   *
	   * @returns {Promise} The Promise to be fulfilled
	   */
	  request(configOrUrl, config) {
	    /*eslint no-param-reassign:0*/
	    // Allow for axios('example/url'[, config]) a la fetch API
	    if (typeof configOrUrl === 'string') {
	      config = config || {};
	      config.url = configOrUrl;
	    } else {
	      config = configOrUrl || {};
	    }

	    config = mergeConfig(this.defaults, config);

	    const {transitional, paramsSerializer, headers} = config;

	    if (transitional !== undefined) {
	      validator.assertOptions(transitional, {
	        silentJSONParsing: validators.transitional(validators.boolean),
	        forcedJSONParsing: validators.transitional(validators.boolean),
	        clarifyTimeoutError: validators.transitional(validators.boolean)
	      }, false);
	    }

	    if (paramsSerializer != null) {
	      if (utils.isFunction(paramsSerializer)) {
	        config.paramsSerializer = {
	          serialize: paramsSerializer
	        };
	      } else {
	        validator.assertOptions(paramsSerializer, {
	          encode: validators.function,
	          serialize: validators.function
	        }, true);
	      }
	    }

	    // Set config.method
	    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

	    let contextHeaders;

	    // Flatten headers
	    contextHeaders = headers && utils.merge(
	      headers.common,
	      headers[config.method]
	    );

	    contextHeaders && utils.forEach(
	      ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
	      (method) => {
	        delete headers[method];
	      }
	    );

	    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

	    // filter out skipped interceptors
	    const requestInterceptorChain = [];
	    let synchronousRequestInterceptors = true;
	    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
	      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
	        return;
	      }

	      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

	      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
	    });

	    const responseInterceptorChain = [];
	    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
	      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
	    });

	    let promise;
	    let i = 0;
	    let len;

	    if (!synchronousRequestInterceptors) {
	      const chain = [dispatchRequest.bind(this), undefined];
	      chain.unshift.apply(chain, requestInterceptorChain);
	      chain.push.apply(chain, responseInterceptorChain);
	      len = chain.length;

	      promise = Promise.resolve(config);

	      while (i < len) {
	        promise = promise.then(chain[i++], chain[i++]);
	      }

	      return promise;
	    }

	    len = requestInterceptorChain.length;

	    let newConfig = config;

	    i = 0;

	    while (i < len) {
	      const onFulfilled = requestInterceptorChain[i++];
	      const onRejected = requestInterceptorChain[i++];
	      try {
	        newConfig = onFulfilled(newConfig);
	      } catch (error) {
	        onRejected.call(this, error);
	        break;
	      }
	    }

	    try {
	      promise = dispatchRequest.call(this, newConfig);
	    } catch (error) {
	      return Promise.reject(error);
	    }

	    i = 0;
	    len = responseInterceptorChain.length;

	    while (i < len) {
	      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
	    }

	    return promise;
	  }

	  getUri(config) {
	    config = mergeConfig(this.defaults, config);
	    const fullPath = buildFullPath(config.baseURL, config.url);
	    return buildURL(fullPath, config.params, config.paramsSerializer);
	  }
	}

	// Provide aliases for supported request methods
	utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
	  /*eslint func-names:0*/
	  Axios.prototype[method] = function(url, config) {
	    return this.request(mergeConfig(config || {}, {
	      method,
	      url,
	      data: (config || {}).data
	    }));
	  };
	});

	utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
	  /*eslint func-names:0*/

	  function generateHTTPMethod(isForm) {
	    return function httpMethod(url, data, config) {
	      return this.request(mergeConfig(config || {}, {
	        method,
	        headers: isForm ? {
	          'Content-Type': 'multipart/form-data'
	        } : {},
	        url,
	        data
	      }));
	    };
	  }

	  Axios.prototype[method] = generateHTTPMethod();

	  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
	});

	var Axios$1 = Axios;

	/**
	 * A `CancelToken` is an object that can be used to request cancellation of an operation.
	 *
	 * @param {Function} executor The executor function.
	 *
	 * @returns {CancelToken}
	 */
	class CancelToken {
	  constructor(executor) {
	    if (typeof executor !== 'function') {
	      throw new TypeError('executor must be a function.');
	    }

	    let resolvePromise;

	    this.promise = new Promise(function promiseExecutor(resolve) {
	      resolvePromise = resolve;
	    });

	    const token = this;

	    // eslint-disable-next-line func-names
	    this.promise.then(cancel => {
	      if (!token._listeners) return;

	      let i = token._listeners.length;

	      while (i-- > 0) {
	        token._listeners[i](cancel);
	      }
	      token._listeners = null;
	    });

	    // eslint-disable-next-line func-names
	    this.promise.then = onfulfilled => {
	      let _resolve;
	      // eslint-disable-next-line func-names
	      const promise = new Promise(resolve => {
	        token.subscribe(resolve);
	        _resolve = resolve;
	      }).then(onfulfilled);

	      promise.cancel = function reject() {
	        token.unsubscribe(_resolve);
	      };

	      return promise;
	    };

	    executor(function cancel(message, config, request) {
	      if (token.reason) {
	        // Cancellation has already been requested
	        return;
	      }

	      token.reason = new CanceledError(message, config, request);
	      resolvePromise(token.reason);
	    });
	  }

	  /**
	   * Throws a `CanceledError` if cancellation has been requested.
	   */
	  throwIfRequested() {
	    if (this.reason) {
	      throw this.reason;
	    }
	  }

	  /**
	   * Subscribe to the cancel signal
	   */

	  subscribe(listener) {
	    if (this.reason) {
	      listener(this.reason);
	      return;
	    }

	    if (this._listeners) {
	      this._listeners.push(listener);
	    } else {
	      this._listeners = [listener];
	    }
	  }

	  /**
	   * Unsubscribe from the cancel signal
	   */

	  unsubscribe(listener) {
	    if (!this._listeners) {
	      return;
	    }
	    const index = this._listeners.indexOf(listener);
	    if (index !== -1) {
	      this._listeners.splice(index, 1);
	    }
	  }

	  /**
	   * Returns an object that contains a new `CancelToken` and a function that, when called,
	   * cancels the `CancelToken`.
	   */
	  static source() {
	    let cancel;
	    const token = new CancelToken(function executor(c) {
	      cancel = c;
	    });
	    return {
	      token,
	      cancel
	    };
	  }
	}

	var CancelToken$1 = CancelToken;

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
	 *
	 * @returns {Function}
	 */
	function spread(callback) {
	  return function wrap(arr) {
	    return callback.apply(null, arr);
	  };
	}

	/**
	 * Determines whether the payload is an error thrown by Axios
	 *
	 * @param {*} payload The value to test
	 *
	 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
	 */
	function isAxiosError(payload) {
	  return utils.isObject(payload) && (payload.isAxiosError === true);
	}

	const HttpStatusCode = {
	  Continue: 100,
	  SwitchingProtocols: 101,
	  Processing: 102,
	  EarlyHints: 103,
	  Ok: 200,
	  Created: 201,
	  Accepted: 202,
	  NonAuthoritativeInformation: 203,
	  NoContent: 204,
	  ResetContent: 205,
	  PartialContent: 206,
	  MultiStatus: 207,
	  AlreadyReported: 208,
	  ImUsed: 226,
	  MultipleChoices: 300,
	  MovedPermanently: 301,
	  Found: 302,
	  SeeOther: 303,
	  NotModified: 304,
	  UseProxy: 305,
	  Unused: 306,
	  TemporaryRedirect: 307,
	  PermanentRedirect: 308,
	  BadRequest: 400,
	  Unauthorized: 401,
	  PaymentRequired: 402,
	  Forbidden: 403,
	  NotFound: 404,
	  MethodNotAllowed: 405,
	  NotAcceptable: 406,
	  ProxyAuthenticationRequired: 407,
	  RequestTimeout: 408,
	  Conflict: 409,
	  Gone: 410,
	  LengthRequired: 411,
	  PreconditionFailed: 412,
	  PayloadTooLarge: 413,
	  UriTooLong: 414,
	  UnsupportedMediaType: 415,
	  RangeNotSatisfiable: 416,
	  ExpectationFailed: 417,
	  ImATeapot: 418,
	  MisdirectedRequest: 421,
	  UnprocessableEntity: 422,
	  Locked: 423,
	  FailedDependency: 424,
	  TooEarly: 425,
	  UpgradeRequired: 426,
	  PreconditionRequired: 428,
	  TooManyRequests: 429,
	  RequestHeaderFieldsTooLarge: 431,
	  UnavailableForLegalReasons: 451,
	  InternalServerError: 500,
	  NotImplemented: 501,
	  BadGateway: 502,
	  ServiceUnavailable: 503,
	  GatewayTimeout: 504,
	  HttpVersionNotSupported: 505,
	  VariantAlsoNegotiates: 506,
	  InsufficientStorage: 507,
	  LoopDetected: 508,
	  NotExtended: 510,
	  NetworkAuthenticationRequired: 511,
	};

	Object.entries(HttpStatusCode).forEach(([key, value]) => {
	  HttpStatusCode[value] = key;
	});

	var HttpStatusCode$1 = HttpStatusCode;

	/**
	 * Create an instance of Axios
	 *
	 * @param {Object} defaultConfig The default config for the instance
	 *
	 * @returns {Axios} A new instance of Axios
	 */
	function createInstance(defaultConfig) {
	  const context = new Axios$1(defaultConfig);
	  const instance = bind(Axios$1.prototype.request, context);

	  // Copy axios.prototype to instance
	  utils.extend(instance, Axios$1.prototype, context, {allOwnKeys: true});

	  // Copy context to instance
	  utils.extend(instance, context, null, {allOwnKeys: true});

	  // Factory for creating new instances
	  instance.create = function create(instanceConfig) {
	    return createInstance(mergeConfig(defaultConfig, instanceConfig));
	  };

	  return instance;
	}

	// Create the default instance to be exported
	const axios = createInstance(defaults$1);

	// Expose Axios class to allow class inheritance
	axios.Axios = Axios$1;

	// Expose Cancel & CancelToken
	axios.CanceledError = CanceledError;
	axios.CancelToken = CancelToken$1;
	axios.isCancel = isCancel;
	axios.VERSION = VERSION;
	axios.toFormData = toFormData;

	// Expose AxiosError class
	axios.AxiosError = AxiosError;

	// alias for CanceledError for backward compatibility
	axios.Cancel = axios.CanceledError;

	// Expose all/spread
	axios.all = function all(promises) {
	  return Promise.all(promises);
	};

	axios.spread = spread;

	// Expose isAxiosError
	axios.isAxiosError = isAxiosError;

	// Expose mergeConfig
	axios.mergeConfig = mergeConfig;

	axios.AxiosHeaders = AxiosHeaders$1;

	axios.formToJSON = thing => formDataToJSON(utils.isHTMLForm(thing) ? new FormData(thing) : thing);

	axios.HttpStatusCode = HttpStatusCode$1;

	axios.default = axios;

	// this module should only have a default export
	var axios$1 = axios;

	const getPackagesInfo = (data) => {
	  return axios$1.post("https://api.npms.io/v2/package/mget", data);
	};

	/* src/components/main.svelte generated by Svelte v4.1.2 */

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[10] = list[i].id;
		child_ctx[11] = list[i].name;
		child_ctx[12] = list[i].current;
		child_ctx[13] = list[i].dev;
		child_ctx[14] = list[i].data;
		return child_ctx;
	}

	// (237:4) {:else}
	function create_else_block(ctx) {
		let section;
		let h1;
		let t0_value = /*currentProject*/ ctx[0].name + "";
		let t0;
		let t1;
		let table;
		let thead;
		let t9;
		let tbody;
		let if_block = /*packages*/ ctx[1] && create_if_block_1(ctx);

		return {
			c() {
				section = element("section");
				h1 = element("h1");
				t0 = text(t0_value);
				t1 = space();
				table = element("table");
				thead = element("thead");
				thead.innerHTML = `<tr class="svelte-g7dy22"><td class="svelte-g7dy22">Package</td> <td class="svelte-g7dy22">Version</td> <td class="svelte-g7dy22">env</td> <td class="svelte-g7dy22">Info</td></tr>`;
				t9 = space();
				tbody = element("tbody");
				if (if_block) if_block.c();
				attr(h1, "class", "projectTable__title svelte-g7dy22");
				attr(table, "class", "svelte-g7dy22");
				attr(section, "class", "projectTable svelte-g7dy22");
			},
			m(target, anchor) {
				insert(target, section, anchor);
				append(section, h1);
				append(h1, t0);
				append(section, t1);
				append(section, table);
				append(table, thead);
				append(table, t9);
				append(table, tbody);
				if (if_block) if_block.m(tbody, null);
			},
			p(ctx, dirty) {
				if (dirty & /*currentProject*/ 1 && t0_value !== (t0_value = /*currentProject*/ ctx[0].name + "")) set_data(t0, t0_value);

				if (/*packages*/ ctx[1]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_1(ctx);
						if_block.c();
						if_block.m(tbody, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			d(detaching) {
				if (detaching) {
					detach(section);
				}

				if (if_block) if_block.d();
			}
		};
	}

	// (205:4) {#if !currentProject}
	function create_if_block(ctx) {
		let section;
		let img;
		let img_src_value;
		let t0;
		let h1;
		let t2;
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				section = element("section");
				img = element("img");
				t0 = space();
				h1 = element("h1");
				h1.textContent = "Select Project to start";
				t2 = space();
				button = element("button");
				button.textContent = "Add Project";
				if (!src_url_equal(img.src, img_src_value = "./images/add.png")) attr(img, "src", img_src_value);
				attr(img, "width", "300");
				attr(img, "alt", "");
				attr(img, "class", "svelte-g7dy22");
				attr(button, "class", "svelte-g7dy22");
				attr(section, "class", "empty svelte-g7dy22");
			},
			m(target, anchor) {
				insert(target, section, anchor);
				append(section, img);
				append(section, t0);
				append(section, h1);
				append(section, t2);
				append(section, button);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[3]);
					mounted = true;
				}
			},
			p: noop$1,
			d(detaching) {
				if (detaching) {
					detach(section);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (250:12) {#if packages}
	function create_if_block_1(ctx) {
		let each_1_anchor;
		let each_value = ensure_array_like(/*packages*/ ctx[1]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert(target, each_1_anchor, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*packages*/ 2) {
					each_value = ensure_array_like(/*packages*/ ctx[1]);
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
			d(detaching) {
				if (detaching) {
					detach(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	// (266:20) {:else}
	function create_else_block_2(ctx) {
		let t0;
		let t1_value = /*data*/ ctx[14].collected.metadata.version + "";
		let t1;
		let t2;

		return {
			c() {
				t0 = text("(Latest ");
				t1 = text(t1_value);
				t2 = text(")");
			},
			m(target, anchor) {
				insert(target, t0, anchor);
				insert(target, t1, anchor);
				insert(target, t2, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*packages*/ 2 && t1_value !== (t1_value = /*data*/ ctx[14].collected.metadata.version + "")) set_data(t1, t1_value);
			},
			d(detaching) {
				if (detaching) {
					detach(t0);
					detach(t1);
					detach(t2);
				}
			}
		};
	}

	// (258:91) 
	function create_if_block_5(ctx) {
		let svg;
		let path;
		let polyline;

		return {
			c() {
				svg = svg_element("svg");
				path = svg_element("path");
				polyline = svg_element("polyline");
				attr(path, "d", "M22 11.08V12a10 10 0 1 1-5.93-9.14");
				attr(polyline, "points", "22 4 12 14.01 9 11.01");
				attr(svg, "class", "projectTable__versionCheck svelte-g7dy22");
				attr(svg, "viewBox", "0 0 24 24");
				attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			},
			m(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path);
				append(svg, polyline);
			},
			p: noop$1,
			d(detaching) {
				if (detaching) {
					detach(svg);
				}
			}
		};
	}

	// (256:20) {#if !data}
	function create_if_block_4(ctx) {
		let span;

		return {
			c() {
				span = element("span");
				attr(span, "class", "skeleton svelte-g7dy22");
			},
			m(target, anchor) {
				insert(target, span, anchor);
			},
			p: noop$1,
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (269:20) {#if dev}
	function create_if_block_3(ctx) {
		let t;

		return {
			c() {
				t = text("dev");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (274:20) {:else}
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

		return {
			c() {
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
				attr(path0, "d", "M1608 897q65 2 122 27.5t99 68.5 66.5 100.5T1920\n                            1216v192h-128v-192q0-32-10.5-61.5t-29-54-44.5-42-57-26.5q6\n                            29 9.5 59.5t3.5 60.5v256q0 7-1 13t-2 13l6-6q60 60 92\n                            138t32 163-32 162.5-92 137.5l-90-90q42-42\n                            64-95.5t22-113.5q0-68-31-132-31 100-90.5 183T1402\n                            1923t-176.5 92-201.5\n                            33-201.5-33-176.5-92-139.5-142-90.5-183q-31 64-31\n                            132 0 60 22 113.5t64 95.5l-90\n                            90q-60-60-92.5-137.5T256 1729t32.5-163 92.5-138l6\n                            6q-1-7-2-13t-1-13v-256q0-30 3.5-60.5t9.5-59.5q-31\n                            9-57 26.5t-44.5 42-29 54T256 1216v192H128v-192q0-65\n                            24.5-122.5T219 993t99-68.5T440 897q31-70\n                            80-135-57-10-105.5-38.5T331 653t-55-94.5T256\n                            448V256h128v192q0 40 15 75t41 61 61 41 75\n                            15h64v3q47-35 96-59-15-32-23.5-66.5T704 448q0-70\n                            31-135L595 173l90-90 127 127q45-39 98.5-60.5T1024\n                            128t113.5 21.5T1236 210l127-127 90 90-140 140q31 65\n                            31 135 0 35-8.5 69.5T1312 584q26 13 49.5 27.5T1408\n                            643v-3h64q40 0 75-15t61-41 41-61 15-75V256h128v192q0\n                            58-20 110.5t-55 94.5-83.5 70.5T1528 762q49 65 80\n                            135zm-584-641q-40 0-75 15t-61 41-41 61-15 75q0 50 24\n                            90 42-11 83.5-17.5t84.5-6.5 84.5 6.5T1192 538q24-40\n                            24-90 0-40-15-75t-41-61-61-41-75-15zm512\n                            896q0-104-41-197t-110.5-163T1222 681t-198-41-198\n                            41-162.5 111T553 955t-41 197v256q0 106 40.5 199t110\n                            162.5 162.5 110 199 40.5 199-40.5 162.5-110\n                            110-162.5 40.5-199v-256z");
				attr(svg0, "viewBox", "0 0 2048 2048");
				attr(svg0, "xmlns", "http://www.w3.org/2000/svg");
				attr(span0, "class", "tooltiptext svelte-g7dy22");
				attr(a0, "class", "projectAction svelte-g7dy22");
				attr(a0, "href", a0_href_value = /*data*/ ctx[14].collected.metadata.links.bugs);
				attr(a0, "title", "Issue");
				attr(path1, "d", "M 16 2.59375 L 15.28125 3.28125 L 2.28125\n                            16.28125 L 3.71875 17.71875 L 5 16.4375 L 5 28 L 14\n                            28 L 14 18 L 18 18 L 18 28 L 27 28 L 27 16.4375 L\n                            28.28125 17.71875 L 29.71875 16.28125 L 16.71875\n                            3.28125 Z M 16 5.4375 L 25 14.4375 L 25 26 L 20 26 L\n                            20 16 L 12 16 L 12 26 L 7 26 L 7 14.4375 Z");
				attr(svg1, "viewBox", "0 0 32 32");
				attr(svg1, "xmlns", "http://www.w3.org/2000/svg");
				attr(span1, "class", "tooltiptext svelte-g7dy22");
				attr(a1, "class", "projectAction svelte-g7dy22");
				attr(a1, "href", a1_href_value = /*data*/ ctx[14].collected.metadata.links.homepage);
				attr(a1, "title", "Home Page");
				attr(path2, "d", "M 0 10 L 0 21 L 9 21 L 9 23 L 16 23 L 16 21 L 32\n                            21 L 32 10 L 0 10 z M 1.7773438 11.777344 L\n                            8.8886719 11.777344 L 8.890625 11.777344 L 8.890625\n                            19.445312 L 7.1113281 19.445312 L 7.1113281\n                            13.556641 L 5.3339844 13.556641 L 5.3339844\n                            19.445312 L 1.7773438 19.445312 L 1.7773438\n                            11.777344 z M 10.667969 11.777344 L 17.777344\n                            11.777344 L 17.779297 11.777344 L 17.779297\n                            19.443359 L 14.222656 19.443359 L 14.222656\n                            21.222656 L 10.667969 21.222656 L 10.667969\n                            11.777344 z M 19.556641 11.777344 L 30.222656\n                            11.777344 L 30.224609 11.777344 L 30.224609\n                            19.445312 L 28.445312 19.445312 L 28.445312\n                            13.556641 L 26.667969 13.556641 L 26.667969\n                            19.445312 L 24.890625 19.445312 L 24.890625\n                            13.556641 L 23.111328 13.556641 L 23.111328\n                            19.445312 L 19.556641 19.445312 L 19.556641\n                            11.777344 z M 14.222656 13.556641 L 14.222656\n                            17.667969 L 16 17.667969 L 16 13.556641 L 14.222656\n                            13.556641 z");
				attr(svg2, "viewBox", "0 0 32 32");
				attr(svg2, "xmlns", "http://www.w3.org/2000/svg");
				attr(span2, "class", "tooltiptext svelte-g7dy22");
				attr(a2, "class", "projectAction svelte-g7dy22");
				attr(a2, "href", a2_href_value = /*data*/ ctx[14].collected.metadata.links.npm);
				attr(a2, "title", "Npm");
				attr(path3, "d", "M723.9985,560 C710.746,560 700,570.787092\n                                700,584.096644 C700,594.740671 706.876,603.77183\n                                716.4145,606.958412 C717.6145,607.179786\n                                718.0525,606.435849 718.0525,605.797328\n                                C718.0525,605.225068 718.0315,603.710086\n                                718.0195,601.699648 C711.343,603.155898\n                                709.9345,598.469394 709.9345,598.469394\n                                C708.844,595.686405 707.2705,594.94548\n                                707.2705,594.94548 C705.091,593.450075\n                                707.4355,593.480194 707.4355,593.480194\n                                C709.843,593.650366 711.1105,595.963499\n                                711.1105,595.963499 C713.2525,599.645538\n                                716.728,598.58234 718.096,597.964902\n                                C718.3135,596.407754 718.9345,595.346062\n                                719.62,594.743683 C714.2905,594.135281\n                                708.688,592.069123 708.688,582.836167\n                                C708.688,580.205279 709.6225,578.054788\n                                711.1585,576.369634 C710.911,575.759726\n                                710.0875,573.311058 711.3925,569.993458\n                                C711.3925,569.993458 713.4085,569.345902\n                                717.9925,572.46321 C719.908,571.928599\n                                721.96,571.662047 724.0015,571.651505\n                                C726.04,571.662047 728.0935,571.928599\n                                730.0105,572.46321 C734.5915,569.345902\n                                736.603,569.993458 736.603,569.993458\n                                C737.9125,573.311058 737.089,575.759726\n                                736.8415,576.369634 C738.3805,578.054788\n                                739.309,580.205279 739.309,582.836167\n                                C739.309,592.091712 733.6975,594.129257\n                                728.3515,594.725612 C729.2125,595.469549\n                                729.9805,596.939353 729.9805,599.18773\n                                C729.9805,602.408949 729.9505,605.006706\n                                729.9505,605.797328 C729.9505,606.441873\n                                730.3825,607.191834 731.6005,606.9554\n                                C741.13,603.762794 748,594.737659 748,584.096644\n                                C748,570.787092 737.254,560 723.9985,560");
				attr(g0, "fill", "#000");
				attr(g0, "transform", "translate(-700.000000, -560.000000)");
				attr(g1, "fill", "none");
				attr(g1, "fillrule", "evenodd");
				attr(g1, "stroke", "none");
				attr(g1, "strokewidth", "1");
				attr(svg3, "viewBox", "0 0 48 47");
				attr(svg3, "xmlns", "http://www.w3.org/2000/svg");
				attr(span3, "class", "tooltiptext svelte-g7dy22");
				attr(a3, "class", "projectAction svelte-g7dy22");
				attr(a3, "href", a3_href_value = /*data*/ ctx[14].collected.metadata.links.repository);
				attr(a3, "title", "Repository");
			},
			m(target, anchor) {
				insert(target, a0, anchor);
				append(a0, svg0);
				append(svg0, path0);
				append(a0, t0);
				append(a0, span0);
				insert(target, t2, anchor);
				insert(target, a1, anchor);
				append(a1, svg1);
				append(svg1, path1);
				append(a1, t3);
				append(a1, span1);
				insert(target, t5, anchor);
				insert(target, a2, anchor);
				append(a2, svg2);
				append(svg2, path2);
				append(a2, t6);
				append(a2, span2);
				insert(target, t8, anchor);
				insert(target, a3, anchor);
				append(a3, svg3);
				append(svg3, g1);
				append(g1, g0);
				append(g0, path3);
				append(a3, t9);
				append(a3, span3);
			},
			p(ctx, dirty) {
				if (dirty & /*packages*/ 2 && a0_href_value !== (a0_href_value = /*data*/ ctx[14].collected.metadata.links.bugs)) {
					attr(a0, "href", a0_href_value);
				}

				if (dirty & /*packages*/ 2 && a1_href_value !== (a1_href_value = /*data*/ ctx[14].collected.metadata.links.homepage)) {
					attr(a1, "href", a1_href_value);
				}

				if (dirty & /*packages*/ 2 && a2_href_value !== (a2_href_value = /*data*/ ctx[14].collected.metadata.links.npm)) {
					attr(a2, "href", a2_href_value);
				}

				if (dirty & /*packages*/ 2 && a3_href_value !== (a3_href_value = /*data*/ ctx[14].collected.metadata.links.repository)) {
					attr(a3, "href", a3_href_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(a0);
					detach(t2);
					detach(a1);
					detach(t5);
					detach(a2);
					detach(t8);
					detach(a3);
				}
			}
		};
	}

	// (272:20) {#if !data}
	function create_if_block_2(ctx) {
		let span;

		return {
			c() {
				span = element("span");
				attr(span, "class", "skeleton svelte-g7dy22");
			},
			m(target, anchor) {
				insert(target, span, anchor);
			},
			p: noop$1,
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (251:14) {#each packages as { id, name, current, dev, data }}
	function create_each_block(ctx) {
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
			if (dirty & /*packages*/ 2) show_if = null;
			if (!/*data*/ ctx[14]) return create_if_block_4;
			if (show_if == null) show_if = !!(/*current*/ ctx[12].replace('^', '') === /*data*/ ctx[14].collected.metadata.version);
			if (show_if) return create_if_block_5;
			return create_else_block_2;
		}

		let current_block_type = select_block_type_1(ctx, -1);
		let if_block0 = current_block_type(ctx);
		let if_block1 = /*dev*/ ctx[13] && create_if_block_3();

		function select_block_type_2(ctx, dirty) {
			if (!/*data*/ ctx[14]) return create_if_block_2;
			return create_else_block_1;
		}

		let current_block_type_1 = select_block_type_2(ctx);
		let if_block2 = current_block_type_1(ctx);

		return {
			c() {
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
				attr(td0, "class", "svelte-g7dy22");
				attr(td1, "class", "svelte-g7dy22");
				attr(td2, "class", "svelte-g7dy22");
				attr(td3, "class", "svelte-g7dy22");
				attr(tr, "id", tr_id_value = `package_${/*id*/ ctx[10]}`);
				attr(tr, "class", "svelte-g7dy22");
			},
			m(target, anchor) {
				insert(target, tr, anchor);
				append(tr, td0);
				append(td0, t0);
				append(tr, t1);
				append(tr, td1);
				append(td1, t2);
				append(td1, t3);
				if_block0.m(td1, null);
				append(tr, t4);
				append(tr, td2);
				if (if_block1) if_block1.m(td2, null);
				append(tr, t5);
				append(tr, td3);
				if_block2.m(td3, null);
				append(tr, t6);
			},
			p(ctx, dirty) {
				if (dirty & /*packages*/ 2 && t0_value !== (t0_value = /*name*/ ctx[11] + "")) set_data(t0, t0_value);
				if (dirty & /*packages*/ 2 && t2_value !== (t2_value = /*current*/ ctx[12] + "")) set_data(t2, t2_value);

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
						if_block1 = create_if_block_3();
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
					attr(tr, "id", tr_id_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(tr);
				}

				if_block0.d();
				if (if_block1) if_block1.d();
				if_block2.d();
			}
		};
	}

	// (204:2) <SimpleBar maxHeight={'calc(100vh - 20px)'}>
	function create_default_slot(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (!/*currentProject*/ ctx[0]) return create_if_block;
			return create_else_block;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, dirty) {
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
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};
	}

	function create_fragment$1(ctx) {
		let div;
		let simplebar;
		let current;

		simplebar = new SimpleBar_1({
				props: {
					maxHeight: 'calc(100vh - 20px)',
					$$slots: { default: [create_default_slot] },
					$$scope: { ctx }
				}
			});

		return {
			c() {
				div = element("div");
				create_component(simplebar.$$.fragment);
				attr(div, "class", "content svelte-g7dy22");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(simplebar, div, null);
				current = true;
			},
			p(ctx, [dirty]) {
				const simplebar_changes = {};

				if (dirty & /*$$scope, $projects, currentProject, packages*/ 131079) {
					simplebar_changes.$$scope = { dirty, ctx };
				}

				simplebar.$set(simplebar_changes);
			},
			i(local) {
				if (current) return;
				transition_in(simplebar.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(simplebar.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(simplebar);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let $projects;
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

		const click_handler = () => {
			openDirectory().then(result => {
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
			}).catch(err => {
				console.log(err);
			});
		};

		return [currentProject, packages, $projects, click_handler];
	}

	class Main extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment$1, safe_not_equal, {});
		}
	}

	/* src/App.svelte generated by Svelte v4.1.2 */

	function create_fragment(ctx) {
		let main1;
		let sidebar;
		let t;
		let main0;
		let current;
		sidebar = new Sidebar({});
		main0 = new Main({});

		return {
			c() {
				main1 = element("main");
				create_component(sidebar.$$.fragment);
				t = space();
				create_component(main0.$$.fragment);
				attr(main1, "class", "main svelte-1odio81");
			},
			m(target, anchor) {
				insert(target, main1, anchor);
				mount_component(sidebar, main1, null);
				append(main1, t);
				mount_component(main0, main1, null);
				current = true;
			},
			p: noop$1,
			i(local) {
				if (current) return;
				transition_in(sidebar.$$.fragment, local);
				transition_in(main0.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(sidebar.$$.fragment, local);
				transition_out(main0.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(main1);
				}

				destroy_component(sidebar);
				destroy_component(main0);
			}
		};
	}

	class App extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, null, create_fragment, safe_not_equal, {});
		}
	}

	const app = new App({
	  target: document.body,
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
