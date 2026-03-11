
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function (util, fs, path, child_process, electron) {
	'use strict';

	var DEV = false;

	// Store the references to globals in case someone tries to monkey patch these, causing the below
	// to de-opt (this occurs often when using popular extensions).
	var is_array = Array.isArray;
	var index_of = Array.prototype.indexOf;
	var includes = Array.prototype.includes;
	var array_from = Array.from;
	var define_property = Object.defineProperty;
	var get_descriptor = Object.getOwnPropertyDescriptor;
	var get_descriptors = Object.getOwnPropertyDescriptors;
	var object_prototype = Object.prototype;
	var array_prototype = Array.prototype;
	var get_prototype_of = Object.getPrototypeOf;
	var is_extensible = Object.isExtensible;

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	const noop$1 = () => {};

	/** @param {Function} fn */
	function run(fn) {
		return fn();
	}

	/** @param {Array<() => void>} arr */
	function run_all(arr) {
		for (var i = 0; i < arr.length; i++) {
			arr[i]();
		}
	}

	/**
	 * TODO replace with Promise.withResolvers once supported widely enough
	 * @template [T=void]
	 */
	function deferred() {
		/** @type {(value: T) => void} */
		var resolve;

		/** @type {(reason: any) => void} */
		var reject;

		/** @type {Promise<T>} */
		var promise = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});

		// @ts-expect-error
		return { promise, resolve, reject };
	}

	/**
	 * When encountering a situation like `let [a, b, c] = $derived(blah())`,
	 * we need to stash an intermediate value that `a`, `b`, and `c` derive
	 * from, in case it's an iterable
	 * @template T
	 * @param {ArrayLike<T> | Iterable<T>} value
	 * @param {number} [n]
	 * @returns {Array<T>}
	 */
	function to_array(value, n) {
		// return arrays unchanged
		if (Array.isArray(value)) {
			return value;
		}

		// if value is not iterable, or `n` is unspecified (indicates a rest
		// element, which means we're not concerned about unbounded iterables)
		// convert to an array with `Array.from`
		if (!(Symbol.iterator in value)) {
			return Array.from(value);
		}

		// otherwise, populate an array with `n` values

		/** @type {T[]} */
		const array = [];

		for (const element of value) {
			array.push(element);
			if (array.length === n) break;
		}

		return array;
	}

	// General flags
	const DERIVED = 1 << 1;
	const EFFECT = 1 << 2;
	const RENDER_EFFECT = 1 << 3;
	/**
	 * An effect that does not destroy its child effects when it reruns.
	 * Runs as part of render effects, i.e. not eagerly as part of tree traversal or effect flushing.
	 */
	const MANAGED_EFFECT = 1 << 24;
	/**
	 * An effect that does not destroy its child effects when it reruns (like MANAGED_EFFECT).
	 * Runs eagerly as part of tree traversal or effect flushing.
	 */
	const BLOCK_EFFECT = 1 << 4;
	const BRANCH_EFFECT = 1 << 5;
	const ROOT_EFFECT = 1 << 6;
	const BOUNDARY_EFFECT = 1 << 7;
	/**
	 * Indicates that a reaction is connected to an effect root — either it is an effect,
	 * or it is a derived that is depended on by at least one effect. If a derived has
	 * no dependents, we can disconnect it from the graph, allowing it to either be
	 * GC'd or reconnected later if an effect comes to depend on it again
	 */
	const CONNECTED = 1 << 9;
	const CLEAN = 1 << 10;
	const DIRTY = 1 << 11;
	const MAYBE_DIRTY = 1 << 12;
	const INERT = 1 << 13;
	const DESTROYED = 1 << 14;
	/** Set once a reaction has run for the first time */
	const REACTION_RAN = 1 << 15;

	// Flags exclusive to effects
	/**
	 * 'Transparent' effects do not create a transition boundary.
	 * This is on a block effect 99% of the time but may also be on a branch effect if its parent block effect was pruned
	 */
	const EFFECT_TRANSPARENT = 1 << 16;
	const EAGER_EFFECT = 1 << 17;
	const HEAD_EFFECT = 1 << 18;
	const EFFECT_PRESERVED = 1 << 19;
	const USER_EFFECT = 1 << 20;
	const EFFECT_OFFSCREEN = 1 << 25;

	// Flags exclusive to deriveds
	/**
	 * Tells that we marked this derived and its reactions as visited during the "mark as (maybe) dirty"-phase.
	 * Will be lifted during execution of the derived and during checking its dirty state (both are necessary
	 * because a derived might be checked but not executed).
	 */
	const WAS_MARKED = 1 << 16;

	// Flags used for async
	const REACTION_IS_UPDATING = 1 << 21;
	const ASYNC = 1 << 22;

	const ERROR_VALUE = 1 << 23;

	const STATE_SYMBOL = Symbol('$state');
	const LEGACY_PROPS = Symbol('legacy props');
	const LOADING_ATTR_SYMBOL = Symbol('');
	const PROXY_PATH_SYMBOL = Symbol('proxy path');

	/** allow users to ignore aborted signal errors if `reason.name === 'StaleReactionError` */
	const STALE_REACTION = new (class StaleReactionError extends Error {
		name = 'StaleReactionError';
		message = 'The reaction that called `getAbortSignal()` was re-run or destroyed';
	})();

	const IS_XHTML =
		// We gotta write it like this because after downleveling the pure comment may end up in the wrong location
		!!globalThis.document?.contentType &&
		/* @__PURE__ */ globalThis.document.contentType.includes('xml');
	const ELEMENT_NODE = 1;
	const DOCUMENT_FRAGMENT_NODE = 11;

	/* This file is generated by scripts/process-messages/index.js. Do not edit! */


	/**
	 * A snippet function was passed invalid arguments. Snippets should only be instantiated via `{@render ...}`
	 * @returns {never}
	 */
	function invalid_snippet_arguments() {
		{
			throw new Error(`https://svelte.dev/e/invalid_snippet_arguments`);
		}
	}

	/**
	 * `%name%(...)` can only be used during component initialisation
	 * @param {string} name
	 * @returns {never}
	 */
	function lifecycle_outside_component(name) {
		{
			throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
		}
	}

	/**
	 * Attempted to render a snippet without a `{@render}` block. This would cause the snippet code to be stringified instead of its content being rendered to the DOM. To fix this, change `{snippet}` to `{@render snippet()}`.
	 * @returns {never}
	 */
	function snippet_without_render_tag() {
		{
			throw new Error(`https://svelte.dev/e/snippet_without_render_tag`);
		}
	}

	/**
	 * `%name%` is not a store with a `subscribe` method
	 * @param {string} name
	 * @returns {never}
	 */
	function store_invalid_shape(name) {
		{
			throw new Error(`https://svelte.dev/e/store_invalid_shape`);
		}
	}

	/* This file is generated by scripts/process-messages/index.js. Do not edit! */


	/**
	 * Cannot create a `$derived(...)` with an `await` expression outside of an effect tree
	 * @returns {never}
	 */
	function async_derived_orphan() {
		{
			throw new Error(`https://svelte.dev/e/async_derived_orphan`);
		}
	}

	/**
	 * Calling `%method%` on a component instance (of %component%) is no longer valid in Svelte 5
	 * @param {string} method
	 * @param {string} component
	 * @returns {never}
	 */
	function component_api_changed(method, component) {
		{
			throw new Error(`https://svelte.dev/e/component_api_changed`);
		}
	}

	/**
	 * Attempted to instantiate %component% with `new %name%`, which is no longer valid in Svelte 5. If this component is not under your control, set the `compatibility.componentApi` compiler option to `4` to keep it working.
	 * @param {string} component
	 * @param {string} name
	 * @returns {never}
	 */
	function component_api_invalid_new(component, name) {
		{
			throw new Error(`https://svelte.dev/e/component_api_invalid_new`);
		}
	}

	/**
	 * Keyed each block has duplicate key `%value%` at indexes %a% and %b%
	 * @param {string} a
	 * @param {string} b
	 * @param {string | undefined | null} [value]
	 * @returns {never}
	 */
	function each_key_duplicate(a, b, value) {
		{
			throw new Error(`https://svelte.dev/e/each_key_duplicate`);
		}
	}

	/**
	 * `%rune%` cannot be used inside an effect cleanup function
	 * @param {string} rune
	 * @returns {never}
	 */
	function effect_in_teardown(rune) {
		{
			throw new Error(`https://svelte.dev/e/effect_in_teardown`);
		}
	}

	/**
	 * Effect cannot be created inside a `$derived` value that was not itself created inside an effect
	 * @returns {never}
	 */
	function effect_in_unowned_derived() {
		{
			throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
		}
	}

	/**
	 * `%rune%` can only be used inside an effect (e.g. during component initialisation)
	 * @param {string} rune
	 * @returns {never}
	 */
	function effect_orphan(rune) {
		{
			throw new Error(`https://svelte.dev/e/effect_orphan`);
		}
	}

	/**
	 * Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state
	 * @returns {never}
	 */
	function effect_update_depth_exceeded() {
		{
			throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
		}
	}

	/**
	 * Cannot do `bind:%key%={undefined}` when `%key%` has a fallback value
	 * @param {string} key
	 * @returns {never}
	 */
	function props_invalid_value(key) {
		{
			throw new Error(`https://svelte.dev/e/props_invalid_value`);
		}
	}

	/**
	 * Property descriptors defined on `$state` objects must contain `value` and always be `enumerable`, `configurable` and `writable`.
	 * @returns {never}
	 */
	function state_descriptors_fixed() {
		{
			throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
		}
	}

	/**
	 * Cannot set prototype of `$state` object
	 * @returns {never}
	 */
	function state_prototype_fixed() {
		{
			throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
		}
	}

	/**
	 * Updating state inside `$derived(...)`, `$inspect(...)` or a template expression is forbidden. If the value should not be reactive, declare it without `$state`
	 * @returns {never}
	 */
	function state_unsafe_mutation() {
		{
			throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
		}
	}

	/**
	 * A `<svelte:boundary>` `reset` function cannot be called while an error is still being handled
	 * @returns {never}
	 */
	function svelte_boundary_reset_onerror() {
		{
			throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
		}
	}

	const EACH_ITEM_REACTIVE = 1;
	const EACH_INDEX_REACTIVE = 1 << 1;
	/** See EachBlock interface metadata.is_controlled for an explanation what this is */
	const EACH_IS_CONTROLLED = 1 << 2;
	const EACH_IS_ANIMATED = 1 << 3;
	const EACH_ITEM_IMMUTABLE = 1 << 4;

	const PROPS_IS_IMMUTABLE = 1;
	const PROPS_IS_RUNES = 1 << 1;
	const PROPS_IS_UPDATED = 1 << 2;
	const PROPS_IS_BINDABLE = 1 << 3;
	const PROPS_IS_LAZY_INITIAL = 1 << 4;
	const TRANSITION_GLOBAL = 1 << 2;

	const TEMPLATE_FRAGMENT = 1;
	const TEMPLATE_USE_IMPORT_NODE = 1 << 1;

	const UNINITIALIZED = Symbol();

	// Dev-time component properties
	const FILENAME = Symbol('filename');

	const NAMESPACE_HTML = 'http://www.w3.org/1999/xhtml';

	const ATTACHMENT_KEY = '@attach';

	/* This file is generated by scripts/process-messages/index.js. Do not edit! */


	/**
	 * Your `console.%method%` contained `$state` proxies. Consider using `$inspect(...)` or `$state.snapshot(...)` instead
	 * @param {string} method
	 */
	function console_log_state(method) {
		{
			console.warn(`https://svelte.dev/e/console_log_state`);
		}
	}

	/**
	 * The `value` property of a `<select multiple>` element should be an array, but it received a non-array value. The selection will be kept as is.
	 */
	function select_multiple_invalid_value() {
		{
			console.warn(`https://svelte.dev/e/select_multiple_invalid_value`);
		}
	}

	/**
	 * Reactive `$state(...)` proxies and the values they proxy have different identities. Because of this, comparisons with `%operator%` will produce unexpected results
	 * @param {string} operator
	 */
	function state_proxy_equality_mismatch(operator) {
		{
			console.warn(`https://svelte.dev/e/state_proxy_equality_mismatch`);
		}
	}

	/**
	 * A `<svelte:boundary>` `reset` function only resets the boundary the first time it is called
	 */
	function svelte_boundary_reset_noop() {
		{
			console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
		}
	}

	/** @import { TemplateNode } from '#client' */


	/** @param {TemplateNode} node */
	function reset(node) {
		return;
	}

	/** @import { Equals } from '#client' */

	/** @type {Equals} */
	function equals(value) {
		return value === this.v;
	}

	/**
	 * @param {unknown} a
	 * @param {unknown} b
	 * @returns {boolean}
	 */
	function safe_not_equal(a, b) {
		return a != a
			? b == b
			: a !== b || (a !== null && typeof a === 'object') || typeof a === 'function';
	}

	/** @type {Equals} */
	function safe_equals(value) {
		return !safe_not_equal(value, this.v);
	}

	/** True if experimental.async=true */
	/** True if we're not certain that we only have Svelte 5 code in the compilation */
	let legacy_mode_flag = false;
	/** True if $inspect.trace is used */
	let tracing_mode_flag = false;

	function enable_legacy_mode_flag() {
		legacy_mode_flag = true;
	}

	/** @import { Snapshot } from './types' */

	/**
	 * In dev, we keep track of which properties could not be cloned. In prod
	 * we don't bother, but we keep a dummy array around so that the
	 * signature stays the same
	 * @type {string[]}
	 */
	const empty = [];

	/**
	 * @template T
	 * @param {T} value
	 * @param {boolean} [skip_warning]
	 * @param {boolean} [no_tojson]
	 * @returns {Snapshot<T>}
	 */
	function snapshot(value, skip_warning = false, no_tojson = false) {

		return clone(value, new Map(), '', empty, null, no_tojson);
	}

	/**
	 * @template T
	 * @param {T} value
	 * @param {Map<T, Snapshot<T>>} cloned
	 * @param {string} path
	 * @param {string[]} paths
	 * @param {null | T} [original] The original value, if `value` was produced from a `toJSON` call
	 * @param {boolean} [no_tojson]
	 * @returns {Snapshot<T>}
	 */
	function clone(value, cloned, path, paths, original = null, no_tojson = false) {
		if (typeof value === 'object' && value !== null) {
			var unwrapped = cloned.get(value);
			if (unwrapped !== undefined) return unwrapped;

			if (value instanceof Map) return /** @type {Snapshot<T>} */ (new Map(value));
			if (value instanceof Set) return /** @type {Snapshot<T>} */ (new Set(value));

			if (is_array(value)) {
				var copy = /** @type {Snapshot<any>} */ (Array(value.length));
				cloned.set(value, copy);

				if (original !== null) {
					cloned.set(original, copy);
				}

				for (var i = 0; i < value.length; i += 1) {
					var element = value[i];
					if (i in value) {
						copy[i] = clone(element, cloned, path, paths, null, no_tojson);
					}
				}

				return copy;
			}

			if (get_prototype_of(value) === object_prototype) {
				/** @type {Snapshot<any>} */
				copy = {};
				cloned.set(value, copy);

				if (original !== null) {
					cloned.set(original, copy);
				}

				for (var key of Object.keys(value)) {
					copy[key] = clone(
						// @ts-expect-error
						value[key],
						cloned,
						path,
						paths,
						null,
						no_tojson
					);
				}

				return copy;
			}

			if (value instanceof Date) {
				return /** @type {Snapshot<T>} */ (structuredClone(value));
			}

			if (typeof (/** @type {T & { toJSON?: any } } */ (value).toJSON) === 'function' && !no_tojson) {
				return clone(
					/** @type {T & { toJSON(): any } } */ (value).toJSON(),
					cloned,
					path,
					paths,
					// Associate the instance with the toJSON clone
					value
				);
			}
		}

		if (value instanceof EventTarget) {
			// can't be cloned
			return /** @type {Snapshot<T>} */ (value);
		}

		try {
			return /** @type {Snapshot<T>} */ (structuredClone(value));
		} catch (e) {

			return /** @type {Snapshot<T>} */ (value);
		}
	}

	/** @import { Derived, Reaction, Value } from '#client' */

	/**
	 * @param {Value} source
	 * @param {string} label
	 */
	function tag(source, label) {
		source.label = label;
		tag_proxy(source.v, label);

		return source;
	}

	/**
	 * @param {unknown} value
	 * @param {string} label
	 */
	function tag_proxy(value, label) {
		// @ts-expect-error
		value?.[PROXY_PATH_SYMBOL]?.(label);
		return value;
	}

	/** @import { ComponentContext, DevStackEntry, Effect } from '#client' */

	/** @type {ComponentContext | null} */
	let component_context = null;

	/** @param {ComponentContext | null} context */
	function set_component_context(context) {
		component_context = context;
	}

	/** @type {DevStackEntry | null} */
	let dev_stack = null;

	/**
	 * Execute a callback with a new dev stack entry
	 * @param {() => any} callback - Function to execute
	 * @param {DevStackEntry['type']} type - Type of block/component
	 * @param {any} component - Component function
	 * @param {number} line - Line number
	 * @param {number} column - Column number
	 * @param {Record<string, any>} [additional] - Any additional properties to add to the dev stack entry
	 * @returns {any}
	 */
	function add_svelte_meta(callback, type, component, line, column, additional) {
		const parent = dev_stack;

		dev_stack = {
			type,
			file: component[FILENAME],
			line,
			column,
			parent,
			...additional
		};

		try {
			return callback();
		} finally {
			dev_stack = parent;
		}
	}

	/**
	 * Retrieves the context that belongs to the closest parent component with the specified `key`.
	 * Must be called during component initialisation.
	 *
	 * [`createContext`](https://svelte.dev/docs/svelte/svelte#createContext) is a type-safe alternative.
	 *
	 * @template T
	 * @param {any} key
	 * @returns {T}
	 */
	function getContext(key) {
		const context_map = get_or_init_context_map();
		const result = /** @type {T} */ (context_map.get(key));
		return result;
	}

	/**
	 * Associates an arbitrary `context` object with the current component and the specified `key`
	 * and returns that object. The context is then available to children of the component
	 * (including slotted content) with `getContext`.
	 *
	 * Like lifecycle functions, this must be called during component initialisation.
	 *
	 * [`createContext`](https://svelte.dev/docs/svelte/svelte#createContext) is a type-safe alternative.
	 *
	 * @template T
	 * @param {any} key
	 * @param {T} context
	 * @returns {T}
	 */
	function setContext(key, context) {
		const context_map = get_or_init_context_map();

		context_map.set(key, context);
		return context;
	}

	/**
	 * Checks whether a given `key` has been set in the context of a parent component.
	 * Must be called during component initialisation.
	 *
	 * @param {any} key
	 * @returns {boolean}
	 */
	function hasContext(key) {
		const context_map = get_or_init_context_map();
		return context_map.has(key);
	}

	/**
	 * @param {Record<string, unknown>} props
	 * @param {any} runes
	 * @param {Function} [fn]
	 * @returns {void}
	 */
	function push(props, runes = false, fn) {
		component_context = {
			p: component_context,
			i: false,
			c: null,
			e: null,
			s: props,
			x: null,
			l: legacy_mode_flag && !runes ? { s: null, u: null, $: [] } : null
		};
	}

	/**
	 * @template {Record<string, any>} T
	 * @param {T} [component]
	 * @returns {T}
	 */
	function pop(component) {
		var context = /** @type {ComponentContext} */ (component_context);
		var effects = context.e;

		if (effects !== null) {
			context.e = null;

			for (var fn of effects) {
				create_user_effect(fn);
			}
		}

		if (component !== undefined) {
			context.x = component;
		}

		context.i = true;

		component_context = context.p;

		return component ?? /** @type {T} */ ({});
	}

	/** @returns {boolean} */
	function is_runes() {
		return !legacy_mode_flag || (component_context !== null && component_context.l === null);
	}

	/**
	 * @param {string} name
	 * @returns {Map<unknown, unknown>}
	 */
	function get_or_init_context_map(name) {
		if (component_context === null) {
			lifecycle_outside_component();
		}

		return (component_context.c ??= new Map(get_parent_context(component_context) || undefined));
	}

	/**
	 * @param {ComponentContext} component_context
	 * @returns {Map<unknown, unknown> | null}
	 */
	function get_parent_context(component_context) {
		let parent = component_context.p;
		while (parent !== null) {
			const context_map = parent.c;
			if (context_map !== null) {
				return context_map;
			}
			parent = parent.p;
		}
		return null;
	}

	/** @type {Array<() => void>} */
	let micro_tasks = [];

	function run_micro_tasks() {
		var tasks = micro_tasks;
		micro_tasks = [];
		run_all(tasks);
	}

	/**
	 * @param {() => void} fn
	 */
	function queue_micro_task(fn) {
		if (micro_tasks.length === 0 && true) {
			var tasks = micro_tasks;
			queueMicrotask(() => {
				// If this is false, a flushSync happened in the meantime. Do _not_ run new scheduled microtasks in that case
				// as the ordering of microtasks would be broken at that point - consider this case:
				// - queue_micro_task schedules microtask A to flush task X
				// - synchronously after, flushSync runs, processing task X
				// - synchronously after, some other microtask B is scheduled, but not through queue_micro_task but for example a Promise.resolve() in user code
				// - synchronously after, queue_micro_task schedules microtask C to flush task Y
				// - one tick later, microtask A now resolves, flushing task Y before microtask B, which is incorrect
				// This if check prevents that race condition (that realistically will only happen in tests)
				if (tasks === micro_tasks) run_micro_tasks();
			});
		}

		micro_tasks.push(fn);
	}

	/** @import { Derived, Effect } from '#client' */
	/** @import { Boundary } from './dom/blocks/boundary.js' */

	/**
	 * @param {unknown} error
	 */
	function handle_error(error) {
		var effect = active_effect;

		// for unowned deriveds, don't throw until we read the value
		if (effect === null) {
			/** @type {Derived} */ (active_reaction).f |= ERROR_VALUE;
			return error;
		}

		// if the error occurred while creating this subtree, we let it
		// bubble up until it hits a boundary that can handle it, unless
		// it's an $effect in which case it doesn't run immediately
		if ((effect.f & REACTION_RAN) === 0 && (effect.f & EFFECT) === 0) {

			throw error;
		}

		// otherwise we bubble up the effect tree ourselves
		invoke_error_boundary(error, effect);
	}

	/**
	 * @param {unknown} error
	 * @param {Effect | null} effect
	 */
	function invoke_error_boundary(error, effect) {
		while (effect !== null) {
			if ((effect.f & BOUNDARY_EFFECT) !== 0) {
				if ((effect.f & REACTION_RAN) === 0) {
					// we are still creating the boundary effect
					throw error;
				}

				try {
					/** @type {Boundary} */ (effect.b).error(error);
					return;
				} catch (e) {
					error = e;
				}
			}

			effect = effect.parent;
		}

		throw error;
	}

	/** @import { Derived, Signal } from '#client' */

	const STATUS_MASK = -7169;

	/**
	 * @param {Signal} signal
	 * @param {number} status
	 */
	function set_signal_status(signal, status) {
		signal.f = (signal.f & STATUS_MASK) | status;
	}

	/**
	 * Set a derived's status to CLEAN or MAYBE_DIRTY based on its connection state.
	 * @param {Derived} derived
	 */
	function update_derived_status(derived) {
		// Only mark as MAYBE_DIRTY if disconnected and has dependencies.
		if ((derived.f & CONNECTED) !== 0 || derived.deps === null) {
			set_signal_status(derived, CLEAN);
		} else {
			set_signal_status(derived, MAYBE_DIRTY);
		}
	}

	/** @import { Derived, Effect, Value } from '#client' */

	/**
	 * @param {Value[] | null} deps
	 */
	function clear_marked(deps) {
		if (deps === null) return;

		for (const dep of deps) {
			if ((dep.f & DERIVED) === 0 || (dep.f & WAS_MARKED) === 0) {
				continue;
			}

			dep.f ^= WAS_MARKED;

			clear_marked(/** @type {Derived} */ (dep).deps);
		}
	}

	/**
	 * @param {Effect} effect
	 * @param {Set<Effect>} dirty_effects
	 * @param {Set<Effect>} maybe_dirty_effects
	 */
	function defer_effect(effect, dirty_effects, maybe_dirty_effects) {
		if ((effect.f & DIRTY) !== 0) {
			dirty_effects.add(effect);
		} else if ((effect.f & MAYBE_DIRTY) !== 0) {
			maybe_dirty_effects.add(effect);
		}

		// Since we're not executing these effects now, we need to clear any WAS_MARKED flags
		// so that other batches can correctly reach these effects during their own traversal
		clear_marked(effect.deps);

		// mark as clean so they get scheduled if they depend on pending async state
		set_signal_status(effect, CLEAN);
	}

	/** @import { Fork } from 'svelte' */
	/** @import { Derived, Effect, Reaction, Source, Value } from '#client' */

	/** @type {Set<Batch>} */
	const batches = new Set();

	/** @type {Batch | null} */
	let current_batch = null;

	/**
	 * When time travelling (i.e. working in one batch, while other batches
	 * still have ongoing work), we ignore the real values of affected
	 * signals in favour of their values within the batch
	 * @type {Map<Value, any> | null}
	 */
	let batch_values = null;

	// TODO this should really be a property of `batch`
	/** @type {Effect[]} */
	let queued_root_effects = [];

	/** @type {Effect | null} */
	let last_scheduled_effect = null;

	/**
	 * During traversal, this is an array. Newly created effects are (if not immediately
	 * executed) pushed to this array, rather than going through the scheduling
	 * rigamarole that would cause another turn of the flush loop.
	 * @type {Effect[] | null}
	 */
	let collected_effects = null;

	let uid = 1;

	class Batch {
		// for debugging. TODO remove once async is stable
		id = uid++;

		/**
		 * The current values of any sources that are updated in this batch
		 * They keys of this map are identical to `this.#previous`
		 * @type {Map<Source, any>}
		 */
		current = new Map();

		/**
		 * The values of any sources that are updated in this batch _before_ those updates took place.
		 * They keys of this map are identical to `this.#current`
		 * @type {Map<Source, any>}
		 */
		previous = new Map();

		/**
		 * When the batch is committed (and the DOM is updated), we need to remove old branches
		 * and append new ones by calling the functions added inside (if/each/key/etc) blocks
		 * @type {Set<(batch: Batch) => void>}
		 */
		#commit_callbacks = new Set();

		/**
		 * If a fork is discarded, we need to destroy any effects that are no longer needed
		 * @type {Set<(batch: Batch) => void>}
		 */
		#discard_callbacks = new Set();

		/**
		 * The number of async effects that are currently in flight
		 */
		#pending = 0;

		/**
		 * The number of async effects that are currently in flight, _not_ inside a pending boundary
		 */
		#blocking_pending = 0;

		/**
		 * A deferred that resolves when the batch is committed, used with `settled()`
		 * TODO replace with Promise.withResolvers once supported widely enough
		 * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
		 */
		#deferred = null;

		/**
		 * Deferred effects (which run after async work has completed) that are DIRTY
		 * @type {Set<Effect>}
		 */
		#dirty_effects = new Set();

		/**
		 * Deferred effects that are MAYBE_DIRTY
		 * @type {Set<Effect>}
		 */
		#maybe_dirty_effects = new Set();

		/**
		 * A map of branches that still exist, but will be destroyed when this batch
		 * is committed — we skip over these during `process`.
		 * The value contains child effects that were dirty/maybe_dirty before being reset,
		 * so they can be rescheduled if the branch survives.
		 * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
		 */
		#skipped_branches = new Map();

		is_fork = false;

		#decrement_queued = false;

		#is_deferred() {
			return this.is_fork || this.#blocking_pending > 0;
		}

		/**
		 * Add an effect to the #skipped_branches map and reset its children
		 * @param {Effect} effect
		 */
		skip_effect(effect) {
			if (!this.#skipped_branches.has(effect)) {
				this.#skipped_branches.set(effect, { d: [], m: [] });
			}
		}

		/**
		 * Remove an effect from the #skipped_branches map and reschedule
		 * any tracked dirty/maybe_dirty child effects
		 * @param {Effect} effect
		 */
		unskip_effect(effect) {
			var tracked = this.#skipped_branches.get(effect);
			if (tracked) {
				this.#skipped_branches.delete(effect);

				for (var e of tracked.d) {
					set_signal_status(e, DIRTY);
					schedule_effect(e);
				}

				for (e of tracked.m) {
					set_signal_status(e, MAYBE_DIRTY);
					schedule_effect(e);
				}
			}
		}

		/**
		 *
		 * @param {Effect[]} root_effects
		 */
		process(root_effects) {
			queued_root_effects = [];

			this.apply();

			/** @type {Effect[]} */
			var effects = (collected_effects = []);

			/** @type {Effect[]} */
			var render_effects = [];

			for (const root of root_effects) {
				this.#traverse_effect_tree(root, effects, render_effects);
				// Note: #traverse_effect_tree runs block effects eagerly, which can schedule effects,
				// which means queued_root_effects now may be filled again.

				// Helpful for debugging reactivity loss that has to do with branches being skipped:
				// log_inconsistent_branches(root);
			}

			collected_effects = null;

			if (this.#is_deferred()) {
				this.#defer_effects(render_effects);
				this.#defer_effects(effects);

				for (const [e, t] of this.#skipped_branches) {
					reset_branch(e, t);
				}
			} else {
				current_batch = null;

				// append/remove branches
				for (const fn of this.#commit_callbacks) fn(this);
				this.#commit_callbacks.clear();

				if (this.#pending === 0) {
					this.#commit();
				}

				flush_queued_effects(render_effects);
				flush_queued_effects(effects);

				// Clear effects. Those that are still needed will be rescheduled through unskipping the skipped branches.
				this.#dirty_effects.clear();
				this.#maybe_dirty_effects.clear();

				this.#deferred?.resolve();
			}

			batch_values = null;
		}

		/**
		 * Traverse the effect tree, executing effects or stashing
		 * them for later execution as appropriate
		 * @param {Effect} root
		 * @param {Effect[]} effects
		 * @param {Effect[]} render_effects
		 */
		#traverse_effect_tree(root, effects, render_effects) {
			root.f ^= CLEAN;

			var effect = root.first;

			while (effect !== null) {
				var flags = effect.f;
				var is_branch = (flags & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
				var is_skippable_branch = is_branch && (flags & CLEAN) !== 0;

				var inert = (flags & INERT) !== 0;
				var skip = is_skippable_branch || this.#skipped_branches.has(effect);

				if (!skip && effect.fn !== null) {
					if (is_branch) {
						if (!inert) effect.f ^= CLEAN;
					} else if ((flags & EFFECT) !== 0) {
						effects.push(effect);
					} else if ((flags & (RENDER_EFFECT | MANAGED_EFFECT)) !== 0 && (inert)) {
						render_effects.push(effect);
					} else if (is_dirty(effect)) {
						update_effect(effect);

						if ((flags & BLOCK_EFFECT) !== 0) {
							this.#maybe_dirty_effects.add(effect);

							// if this is inside an outroing block, ensure that the block
							// re-runs if the outro is later aborted
							if (inert) set_signal_status(effect, DIRTY);
						}
					}

					var child = effect.first;

					if (child !== null) {
						effect = child;
						continue;
					}
				}

				while (effect !== null) {
					var next = effect.next;

					if (next !== null) {
						effect = next;
						break;
					}

					effect = effect.parent;
				}
			}
		}

		/**
		 * @param {Effect[]} effects
		 */
		#defer_effects(effects) {
			for (var i = 0; i < effects.length; i += 1) {
				defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects);
			}
		}

		/**
		 * Associate a change to a given source with the current
		 * batch, noting its previous and current values
		 * @param {Source} source
		 * @param {any} value
		 */
		capture(source, value) {
			if (value !== UNINITIALIZED && !this.previous.has(source)) {
				this.previous.set(source, value);
			}

			// Don't save errors in `batch_values`, or they won't be thrown in `runtime.js#get`
			if ((source.f & ERROR_VALUE) === 0) {
				this.current.set(source, source.v);
				batch_values?.set(source, source.v);
			}
		}

		activate() {
			current_batch = this;
			this.apply();
		}

		deactivate() {
			// If we're not the current batch, don't deactivate,
			// else we could create zombie batches that are never flushed
			if (current_batch !== this) return;

			current_batch = null;
			batch_values = null;
		}

		flush() {
			if (queued_root_effects.length > 0) {
				current_batch = this;
				flush_effects();
			} else if (this.#pending === 0 && !this.is_fork) {
				// append/remove branches
				for (const fn of this.#commit_callbacks) fn(this);
				this.#commit_callbacks.clear();

				this.#commit();
				this.#deferred?.resolve();
			}

			this.deactivate();
		}

		discard() {
			for (const fn of this.#discard_callbacks) fn(this);
			this.#discard_callbacks.clear();
		}

		#commit() {
			// If there are other pending batches, they now need to be 'rebased' —
			// in other words, we re-run block/async effects with the newly
			// committed state, unless the batch in question has a more
			// recent value for a given source
			if (batches.size > 1) {
				this.previous.clear();

				var previous_batch = current_batch;
				var previous_batch_values = batch_values;
				var is_earlier = true;

				for (const batch of batches) {
					if (batch === this) {
						is_earlier = false;
						continue;
					}

					/** @type {Source[]} */
					const sources = [];

					for (const [source, value] of this.current) {
						if (batch.current.has(source)) {
							if (is_earlier && value !== batch.current.get(source)) {
								// bring the value up to date
								batch.current.set(source, value);
							} else {
								// same value or later batch has more recent value,
								// no need to re-run these effects
								continue;
							}
						}

						sources.push(source);
					}

					if (sources.length === 0) {
						continue;
					}

					// Re-run async/block effects that depend on distinct values changed in both batches
					const others = [...batch.current.keys()].filter((s) => !this.current.has(s));
					if (others.length > 0) {
						// Avoid running queued root effects on the wrong branch
						var prev_queued_root_effects = queued_root_effects;
						queued_root_effects = [];

						/** @type {Set<Value>} */
						const marked = new Set();
						/** @type {Map<Reaction, boolean>} */
						const checked = new Map();
						for (const source of sources) {
							mark_effects(source, others, marked, checked);
						}

						if (queued_root_effects.length > 0) {
							current_batch = batch;
							batch.apply();

							for (const root of queued_root_effects) {
								batch.#traverse_effect_tree(root, [], []);
							}

							// TODO do we need to do anything with the dummy effect arrays?

							batch.deactivate();
						}

						queued_root_effects = prev_queued_root_effects;
					}
				}

				current_batch = previous_batch;
				batch_values = previous_batch_values;
			}

			this.#skipped_branches.clear();
			batches.delete(this);
		}

		/**
		 *
		 * @param {boolean} blocking
		 */
		increment(blocking) {
			this.#pending += 1;
			if (blocking) this.#blocking_pending += 1;
		}

		/**
		 *
		 * @param {boolean} blocking
		 */
		decrement(blocking) {
			this.#pending -= 1;
			if (blocking) this.#blocking_pending -= 1;

			if (this.#decrement_queued) return;
			this.#decrement_queued = true;

			queue_micro_task(() => {
				this.#decrement_queued = false;

				if (!this.#is_deferred()) {
					// we only reschedule previously-deferred effects if we expect
					// to be able to run them after processing the batch
					this.revive();
				} else if (queued_root_effects.length > 0) {
					// if other effects are scheduled, process the batch _without_
					// rescheduling the previously-deferred effects
					this.flush();
				}
			});
		}

		revive() {
			for (const e of this.#dirty_effects) {
				this.#maybe_dirty_effects.delete(e);
				set_signal_status(e, DIRTY);
				schedule_effect(e);
			}

			for (const e of this.#maybe_dirty_effects) {
				set_signal_status(e, MAYBE_DIRTY);
				schedule_effect(e);
			}

			this.flush();
		}

		/** @param {(batch: Batch) => void} fn */
		oncommit(fn) {
			this.#commit_callbacks.add(fn);
		}

		/** @param {(batch: Batch) => void} fn */
		ondiscard(fn) {
			this.#discard_callbacks.add(fn);
		}

		settled() {
			return (this.#deferred ??= deferred()).promise;
		}

		static ensure() {
			if (current_batch === null) {
				const batch = (current_batch = new Batch());
				batches.add(current_batch);

				{
					queue_micro_task(() => {
						if (current_batch !== batch) {
							// a flushSync happened in the meantime
							return;
						}

						batch.flush();
					});
				}
			}

			return current_batch;
		}

		apply() {
			return;
		}
	}

	function flush_effects() {
		var source_stacks = null;

		try {
			var flush_count = 0;

			while (queued_root_effects.length > 0) {
				var batch = Batch.ensure();

				if (flush_count++ > 1000) {
					var updates, entry; if (DEV) ;

					infinite_loop_guard();
				}

				batch.process(queued_root_effects);
				old_values.clear();

				if (DEV) ;
			}
		} finally {
			queued_root_effects = [];

			last_scheduled_effect = null;
			collected_effects = null;
		}
	}

	function infinite_loop_guard() {
		try {
			effect_update_depth_exceeded();
		} catch (error) {

			// Best effort: invoke the boundary nearest the most recent
			// effect and hope that it's relevant to the infinite loop
			invoke_error_boundary(error, last_scheduled_effect);
		}
	}

	/** @type {Set<Effect> | null} */
	let eager_block_effects = null;

	/**
	 * @param {Array<Effect>} effects
	 * @returns {void}
	 */
	function flush_queued_effects(effects) {
		var length = effects.length;
		if (length === 0) return;

		var i = 0;

		while (i < length) {
			var effect = effects[i++];

			if ((effect.f & (DESTROYED | INERT)) === 0 && is_dirty(effect)) {
				eager_block_effects = new Set();

				update_effect(effect);

				// Effects with no dependencies or teardown do not get added to the effect tree.
				// Deferred effects (e.g. `$effect(...)`) _are_ added to the tree because we
				// don't know if we need to keep them until they are executed. Doing the check
				// here (rather than in `update_effect`) allows us to skip the work for
				// immediate effects.
				if (
					effect.deps === null &&
					effect.first === null &&
					effect.nodes === null &&
					effect.teardown === null &&
					effect.ac === null
				) {
					// remove this effect from the graph
					unlink_effect(effect);
				}

				// If update_effect() has a flushSync() in it, we may have flushed another flush_queued_effects(),
				// which already handled this logic and did set eager_block_effects to null.
				if (eager_block_effects?.size > 0) {
					old_values.clear();

					for (const e of eager_block_effects) {
						// Skip eager effects that have already been unmounted
						if ((e.f & (DESTROYED | INERT)) !== 0) continue;

						// Run effects in order from ancestor to descendant, else we could run into nullpointers
						/** @type {Effect[]} */
						const ordered_effects = [e];
						let ancestor = e.parent;
						while (ancestor !== null) {
							if (eager_block_effects.has(ancestor)) {
								eager_block_effects.delete(ancestor);
								ordered_effects.push(ancestor);
							}
							ancestor = ancestor.parent;
						}

						for (let j = ordered_effects.length - 1; j >= 0; j--) {
							const e = ordered_effects[j];
							// Skip eager effects that have already been unmounted
							if ((e.f & (DESTROYED | INERT)) !== 0) continue;
							update_effect(e);
						}
					}

					eager_block_effects.clear();
				}
			}
		}

		eager_block_effects = null;
	}

	/**
	 * This is similar to `mark_reactions`, but it only marks async/block effects
	 * depending on `value` and at least one of the other `sources`, so that
	 * these effects can re-run after another batch has been committed
	 * @param {Value} value
	 * @param {Source[]} sources
	 * @param {Set<Value>} marked
	 * @param {Map<Reaction, boolean>} checked
	 */
	function mark_effects(value, sources, marked, checked) {
		if (marked.has(value)) return;
		marked.add(value);

		if (value.reactions !== null) {
			for (const reaction of value.reactions) {
				const flags = reaction.f;

				if ((flags & DERIVED) !== 0) {
					mark_effects(/** @type {Derived} */ (reaction), sources, marked, checked);
				} else if (
					(flags & (ASYNC | BLOCK_EFFECT)) !== 0 &&
					(flags & DIRTY) === 0 &&
					depends_on(reaction, sources, checked)
				) {
					set_signal_status(reaction, DIRTY);
					schedule_effect(/** @type {Effect} */ (reaction));
				}
			}
		}
	}

	/**
	 * @param {Reaction} reaction
	 * @param {Source[]} sources
	 * @param {Map<Reaction, boolean>} checked
	 */
	function depends_on(reaction, sources, checked) {
		const depends = checked.get(reaction);
		if (depends !== undefined) return depends;

		if (reaction.deps !== null) {
			for (const dep of reaction.deps) {
				if (includes.call(sources, dep)) {
					return true;
				}

				if ((dep.f & DERIVED) !== 0 && depends_on(/** @type {Derived} */ (dep), sources, checked)) {
					checked.set(/** @type {Derived} */ (dep), true);
					return true;
				}
			}
		}

		checked.set(reaction, false);

		return false;
	}

	/**
	 * @param {Effect} signal
	 * @returns {void}
	 */
	function schedule_effect(signal) {
		var effect = (last_scheduled_effect = signal);

		var boundary = effect.b;

		// defer render effects inside a pending boundary
		// TODO the `REACTION_RAN` check is only necessary because of legacy `$:` effects AFAICT — we can remove later
		if (
			boundary?.is_pending &&
			(signal.f & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0 &&
			(signal.f & REACTION_RAN) === 0
		) {
			boundary.defer_effect(signal);
			return;
		}

		while (effect.parent !== null) {
			effect = effect.parent;
			var flags = effect.f;

			// if the effect is being scheduled because a parent (each/await/etc) block
			// updated an internal source, or because a branch is being unskipped,
			// bail out or we'll cause a second flush
			if (collected_effects !== null && effect === active_effect) {
				// in sync mode, render effects run during traversal. in an extreme edge case
				// they can be made dirty after they have already been visited, in which
				// case we shouldn't bail out
				if ((signal.f & RENDER_EFFECT) === 0) {
					return;
				}
			}

			if ((flags & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
				if ((flags & CLEAN) === 0) {
					// branch is already dirty, bail
					return;
				}

				effect.f ^= CLEAN;
			}
		}

		queued_root_effects.push(effect);
	}

	/**
	 * Mark all the effects inside a skipped branch CLEAN, so that
	 * they can be correctly rescheduled later. Tracks dirty and maybe_dirty
	 * effects so they can be rescheduled if the branch survives.
	 * @param {Effect} effect
	 * @param {{ d: Effect[], m: Effect[] }} tracked
	 */
	function reset_branch(effect, tracked) {
		// clean branch = nothing dirty inside, no need to traverse further
		if ((effect.f & BRANCH_EFFECT) !== 0 && (effect.f & CLEAN) !== 0) {
			return;
		}

		if ((effect.f & DIRTY) !== 0) {
			tracked.d.push(effect);
		} else if ((effect.f & MAYBE_DIRTY) !== 0) {
			tracked.m.push(effect);
		}

		set_signal_status(effect, CLEAN);

		var e = effect.first;
		while (e !== null) {
			reset_branch(e, tracked);
			e = e.next;
		}
	}

	/**
	 * Returns a `subscribe` function that integrates external event-based systems with Svelte's reactivity.
	 * It's particularly useful for integrating with web APIs like `MediaQuery`, `IntersectionObserver`, or `WebSocket`.
	 *
	 * If `subscribe` is called inside an effect (including indirectly, for example inside a getter),
	 * the `start` callback will be called with an `update` function. Whenever `update` is called, the effect re-runs.
	 *
	 * If `start` returns a cleanup function, it will be called when the effect is destroyed.
	 *
	 * If `subscribe` is called in multiple effects, `start` will only be called once as long as the effects
	 * are active, and the returned teardown function will only be called when all effects are destroyed.
	 *
	 * It's best understood with an example. Here's an implementation of [`MediaQuery`](https://svelte.dev/docs/svelte/svelte-reactivity#MediaQuery):
	 *
	 * ```js
	 * import { createSubscriber } from 'svelte/reactivity';
	 * import { on } from 'svelte/events';
	 *
	 * export class MediaQuery {
	 * 	#query;
	 * 	#subscribe;
	 *
	 * 	constructor(query) {
	 * 		this.#query = window.matchMedia(`(${query})`);
	 *
	 * 		this.#subscribe = createSubscriber((update) => {
	 * 			// when the `change` event occurs, re-run any effects that read `this.current`
	 * 			const off = on(this.#query, 'change', update);
	 *
	 * 			// stop listening when all the effects are destroyed
	 * 			return () => off();
	 * 		});
	 * 	}
	 *
	 * 	get current() {
	 * 		// This makes the getter reactive, if read in an effect
	 * 		this.#subscribe();
	 *
	 * 		// Return the current state of the query, whether or not we're in an effect
	 * 		return this.#query.matches;
	 * 	}
	 * }
	 * ```
	 * @param {(update: () => void) => (() => void) | void} start
	 * @since 5.7.0
	 */
	function createSubscriber(start) {
		let subscribers = 0;
		let version = source(0);
		/** @type {(() => void) | void} */
		let stop;

		return () => {
			if (effect_tracking()) {
				get$1(version);

				render_effect(() => {
					if (subscribers === 0) {
						stop = untrack(() => start(() => increment(version)));
					}

					subscribers += 1;

					return () => {
						queue_micro_task(() => {
							// Only count down after a microtask, else we would reach 0 before our own render effect reruns,
							// but reach 1 again when the tick callback of the prior teardown runs. That would mean we
							// re-subcribe unnecessarily and create a memory leak because the old subscription is never cleaned up.
							subscribers -= 1;

							if (subscribers === 0) {
								stop?.();
								stop = undefined;
								// Increment the version to ensure any dependent deriveds are marked dirty when the subscription is picked up again later.
								// If we didn't do this then the comparison of write versions would determine that the derived has a later version than
								// the subscriber, and it would not be re-run.
								increment(version);
							}
						});
					};
				});
			}
		};
	}

	/** @import { Effect, Source, TemplateNode, } from '#client' */

	/**
	 * @typedef {{
	 * 	 onerror?: (error: unknown, reset: () => void) => void;
	 *   failed?: (anchor: Node, error: () => unknown, reset: () => () => void) => void;
	 *   pending?: (anchor: Node) => void;
	 * }} BoundaryProps
	 */

	var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;

	/**
	 * @param {TemplateNode} node
	 * @param {BoundaryProps} props
	 * @param {((anchor: Node) => void)} children
	 * @param {((error: unknown) => unknown) | undefined} [transform_error]
	 * @returns {void}
	 */
	function boundary(node, props, children, transform_error) {
		new Boundary(node, props, children, transform_error);
	}

	class Boundary {
		/** @type {Boundary | null} */
		parent;

		is_pending = false;

		/**
		 * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
		 * Inherited from parent boundary, or defaults to identity.
		 * @type {(error: unknown) => unknown}
		 */
		transform_error;

		/** @type {TemplateNode} */
		#anchor;

		/** @type {TemplateNode | null} */
		#hydrate_open = null;

		/** @type {BoundaryProps} */
		#props;

		/** @type {((anchor: Node) => void)} */
		#children;

		/** @type {Effect} */
		#effect;

		/** @type {Effect | null} */
		#main_effect = null;

		/** @type {Effect | null} */
		#pending_effect = null;

		/** @type {Effect | null} */
		#failed_effect = null;

		/** @type {DocumentFragment | null} */
		#offscreen_fragment = null;

		#local_pending_count = 0;
		#pending_count = 0;
		#pending_count_update_queued = false;

		/** @type {Set<Effect>} */
		#dirty_effects = new Set();

		/** @type {Set<Effect>} */
		#maybe_dirty_effects = new Set();

		/**
		 * A source containing the number of pending async deriveds/expressions.
		 * Only created if `$effect.pending()` is used inside the boundary,
		 * otherwise updating the source results in needless `Batch.ensure()`
		 * calls followed by no-op flushes
		 * @type {Source<number> | null}
		 */
		#effect_pending = null;

		#effect_pending_subscriber = createSubscriber(() => {
			this.#effect_pending = source(this.#local_pending_count);

			return () => {
				this.#effect_pending = null;
			};
		});

		/**
		 * @param {TemplateNode} node
		 * @param {BoundaryProps} props
		 * @param {((anchor: Node) => void)} children
		 * @param {((error: unknown) => unknown) | undefined} [transform_error]
		 */
		constructor(node, props, children, transform_error) {
			this.#anchor = node;
			this.#props = props;

			this.#children = (anchor) => {
				var effect = /** @type {Effect} */ (active_effect);

				effect.b = this;
				effect.f |= BOUNDARY_EFFECT;

				children(anchor);
			};

			this.parent = /** @type {Effect} */ (active_effect).b;

			// Inherit transform_error from parent boundary, or use the provided one, or default to identity
			this.transform_error = transform_error ?? this.parent?.transform_error ?? ((e) => e);

			this.#effect = block(() => {
				{
					this.#render();
				}
			}, flags);
		}

		#hydrate_resolved_content() {
			try {
				this.#main_effect = branch(() => this.#children(this.#anchor));
			} catch (error) {
				this.error(error);
			}
		}

		/**
		 * @param {unknown} error The deserialized error from the server's hydration comment
		 */
		#hydrate_failed_content(error) {
			const failed = this.#props.failed;
			if (!failed) return;

			this.#failed_effect = branch(() => {
				failed(
					this.#anchor,
					() => error,
					() => () => {}
				);
			});
		}

		#hydrate_pending_content() {
			const pending = this.#props.pending;
			if (!pending) return;

			this.is_pending = true;
			this.#pending_effect = branch(() => pending(this.#anchor));

			queue_micro_task(() => {
				var fragment = (this.#offscreen_fragment = document.createDocumentFragment());
				var anchor = create_text();

				fragment.append(anchor);

				this.#main_effect = this.#run(() => {
					Batch.ensure();
					return branch(() => this.#children(anchor));
				});

				if (this.#pending_count === 0) {
					this.#anchor.before(fragment);
					this.#offscreen_fragment = null;

					pause_effect(/** @type {Effect} */ (this.#pending_effect), () => {
						this.#pending_effect = null;
					});

					this.#resolve();
				}
			});
		}

		#render() {
			try {
				this.is_pending = this.has_pending_snippet();
				this.#pending_count = 0;
				this.#local_pending_count = 0;

				this.#main_effect = branch(() => {
					this.#children(this.#anchor);
				});

				if (this.#pending_count > 0) {
					var fragment = (this.#offscreen_fragment = document.createDocumentFragment());
					move_effect(this.#main_effect, fragment);

					const pending = /** @type {(anchor: Node) => void} */ (this.#props.pending);
					this.#pending_effect = branch(() => pending(this.#anchor));
				} else {
					this.#resolve();
				}
			} catch (error) {
				this.error(error);
			}
		}

		#resolve() {
			this.is_pending = false;

			// any effects that were previously deferred should be rescheduled —
			// after the next traversal (which will happen immediately, due to the
			// same update that brought us here) the effects will be flushed
			for (const e of this.#dirty_effects) {
				set_signal_status(e, DIRTY);
				schedule_effect(e);
			}

			for (const e of this.#maybe_dirty_effects) {
				set_signal_status(e, MAYBE_DIRTY);
				schedule_effect(e);
			}

			this.#dirty_effects.clear();
			this.#maybe_dirty_effects.clear();
		}

		/**
		 * Defer an effect inside a pending boundary until the boundary resolves
		 * @param {Effect} effect
		 */
		defer_effect(effect) {
			defer_effect(effect, this.#dirty_effects, this.#maybe_dirty_effects);
		}

		/**
		 * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
		 * @returns {boolean}
		 */
		is_rendered() {
			return !this.is_pending && (!this.parent || this.parent.is_rendered());
		}

		has_pending_snippet() {
			return !!this.#props.pending;
		}

		/**
		 * @template T
		 * @param {() => T} fn
		 */
		#run(fn) {
			var previous_effect = active_effect;
			var previous_reaction = active_reaction;
			var previous_ctx = component_context;

			set_active_effect(this.#effect);
			set_active_reaction(this.#effect);
			set_component_context(this.#effect.ctx);

			try {
				return fn();
			} catch (e) {
				handle_error(e);
				return null;
			} finally {
				set_active_effect(previous_effect);
				set_active_reaction(previous_reaction);
				set_component_context(previous_ctx);
			}
		}

		/**
		 * Updates the pending count associated with the currently visible pending snippet,
		 * if any, such that we can replace the snippet with content once work is done
		 * @param {1 | -1} d
		 */
		#update_pending_count(d) {
			if (!this.has_pending_snippet()) {
				if (this.parent) {
					this.parent.#update_pending_count(d);
				}

				// if there's no parent, we're in a scope with no pending snippet
				return;
			}

			this.#pending_count += d;

			if (this.#pending_count === 0) {
				this.#resolve();

				if (this.#pending_effect) {
					pause_effect(this.#pending_effect, () => {
						this.#pending_effect = null;
					});
				}

				if (this.#offscreen_fragment) {
					this.#anchor.before(this.#offscreen_fragment);
					this.#offscreen_fragment = null;
				}
			}
		}

		/**
		 * Update the source that powers `$effect.pending()` inside this boundary,
		 * and controls when the current `pending` snippet (if any) is removed.
		 * Do not call from inside the class
		 * @param {1 | -1} d
		 */
		update_pending_count(d) {
			this.#update_pending_count(d);

			this.#local_pending_count += d;

			if (!this.#effect_pending || this.#pending_count_update_queued) return;
			this.#pending_count_update_queued = true;

			queue_micro_task(() => {
				this.#pending_count_update_queued = false;
				if (this.#effect_pending) {
					internal_set(this.#effect_pending, this.#local_pending_count);
				}
			});
		}

		get_effect_pending() {
			this.#effect_pending_subscriber();
			return get$1(/** @type {Source<number>} */ (this.#effect_pending));
		}

		/** @param {unknown} error */
		error(error) {
			var onerror = this.#props.onerror;
			let failed = this.#props.failed;

			// If we have nothing to capture the error, or if we hit an error while
			// rendering the fallback, re-throw for another boundary to handle
			if (!onerror && !failed) {
				throw error;
			}

			if (this.#main_effect) {
				destroy_effect(this.#main_effect);
				this.#main_effect = null;
			}

			if (this.#pending_effect) {
				destroy_effect(this.#pending_effect);
				this.#pending_effect = null;
			}

			if (this.#failed_effect) {
				destroy_effect(this.#failed_effect);
				this.#failed_effect = null;
			}

			var did_reset = false;
			var calling_on_error = false;

			const reset = () => {
				if (did_reset) {
					svelte_boundary_reset_noop();
					return;
				}

				did_reset = true;

				if (calling_on_error) {
					svelte_boundary_reset_onerror();
				}

				if (this.#failed_effect !== null) {
					pause_effect(this.#failed_effect, () => {
						this.#failed_effect = null;
					});
				}

				this.#run(() => {
					// If the failure happened while flushing effects, current_batch can be null
					Batch.ensure();

					this.#render();
				});
			};

			/** @param {unknown} transformed_error */
			const handle_error_result = (transformed_error) => {
				try {
					calling_on_error = true;
					onerror?.(transformed_error, reset);
					calling_on_error = false;
				} catch (error) {
					invoke_error_boundary(error, this.#effect && this.#effect.parent);
				}

				if (failed) {
					this.#failed_effect = this.#run(() => {
						Batch.ensure();

						try {
							return branch(() => {
								// errors in `failed` snippets cause the boundary to error again
								// TODO Svelte 6: revisit this decision, most likely better to go to parent boundary instead
								var effect = /** @type {Effect} */ (active_effect);

								effect.b = this;
								effect.f |= BOUNDARY_EFFECT;

								failed(
									this.#anchor,
									() => transformed_error,
									() => reset
								);
							});
						} catch (error) {
							invoke_error_boundary(error, /** @type {Effect} */ (this.#effect.parent));
							return null;
						}
					});
				}
			};

			queue_micro_task(() => {
				// Run the error through the API-level transformError transform (e.g. SvelteKit's handleError)
				/** @type {unknown} */
				var result;
				try {
					result = this.transform_error(error);
				} catch (e) {
					invoke_error_boundary(e, this.#effect && this.#effect.parent);
					return;
				}

				if (
					result !== null &&
					typeof result === 'object' &&
					typeof (/** @type {any} */ (result).then) === 'function'
				) {
					// transformError returned a Promise — wait for it
					/** @type {any} */ (result).then(
						handle_error_result,
						/** @param {unknown} e */
						(e) => invoke_error_boundary(e, this.#effect && this.#effect.parent)
					);
				} else {
					// Synchronous result — handle immediately
					handle_error_result(result);
				}
			});
		}
	}

	/** @import { Blocker, Effect, Value } from '#client' */

	/**
	 * @param {Blocker[]} blockers
	 * @param {Array<() => any>} sync
	 * @param {Array<() => Promise<any>>} async
	 * @param {(values: Value[]) => any} fn
	 */
	function flatten(blockers, sync, async, fn) {
		const d = is_runes() ? derived : derived_safe_equal;

		// Filter out already-settled blockers - no need to wait for them
		var pending = blockers.filter((b) => !b.settled);

		if (async.length === 0 && pending.length === 0) {
			fn(sync.map(d));
			return;
		}
		var parent = /** @type {Effect} */ (active_effect);

		var restore = capture();
		var blocker_promise =
			pending.length === 1
				? pending[0].promise
				: pending.length > 1
					? Promise.all(pending.map((b) => b.promise))
					: null;

		/** @param {Value[]} values */
		function finish(values) {
			restore();

			try {
				fn(values);
			} catch (error) {
				if ((parent.f & DESTROYED) === 0) {
					invoke_error_boundary(error, parent);
				}
			}

			unset_context();
		}

		// Fast path: blockers but no async expressions
		if (async.length === 0) {
			/** @type {Promise<any>} */ (blocker_promise).then(() => finish(sync.map(d)));
			return;
		}

		// Full path: has async expressions
		function run() {
			restore();
			Promise.all(async.map((expression) => async_derived(expression)))
				.then((result) => finish([...sync.map(d), ...result]))
				.catch((error) => invoke_error_boundary(error, parent));
		}

		if (blocker_promise) {
			blocker_promise.then(run);
		} else {
			run();
		}
	}

	/**
	 * Captures the current effect context so that we can restore it after
	 * some asynchronous work has happened (so that e.g. `await a + b`
	 * causes `b` to be registered as a dependency).
	 */
	function capture() {
		var previous_effect = active_effect;
		var previous_reaction = active_reaction;
		var previous_component_context = component_context;
		var previous_batch = current_batch;

		return function restore(activate_batch = true) {
			set_active_effect(previous_effect);
			set_active_reaction(previous_reaction);
			set_component_context(previous_component_context);
			if (activate_batch) previous_batch?.activate();
		};
	}

	/**
	 * Reset `current_async_effect` after the `promise` resolves, so
	 * that we can emit `await_reactivity_loss` warnings
	 * @template T
	 * @param {Promise<T>} promise
	 * @returns {Promise<() => T>}
	 */
	async function track_reactivity_loss(promise) {
		var value = await promise;

		return () => {
			return value;
		};
	}

	function unset_context(deactivate_batch = true) {
		set_active_effect(null);
		set_active_reaction(null);
		set_component_context(null);
		if (deactivate_batch) current_batch?.deactivate();
	}

	function increment_pending() {
		var boundary = /** @type {Boundary} */ (/** @type {Effect} */ (active_effect).b);
		var batch = /** @type {Batch} */ (current_batch);
		var blocking = boundary.is_rendered();

		boundary.update_pending_count(1);
		batch.increment(blocking);

		return () => {
			boundary.update_pending_count(-1);
			batch.decrement(blocking);
		};
	}

	/** @import { Derived, Effect, Source } from '#client' */
	/** @import { Batch } from './batch.js'; */

	/**
	 * @template V
	 * @param {() => V} fn
	 * @returns {Derived<V>}
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function derived(fn) {
		var flags = DERIVED | DIRTY;
		var parent_derived =
			active_reaction !== null && (active_reaction.f & DERIVED) !== 0
				? /** @type {Derived} */ (active_reaction)
				: null;

		if (active_effect !== null) {
			// Since deriveds are evaluated lazily, any effects created inside them are
			// created too late to ensure that the parent effect is added to the tree
			active_effect.f |= EFFECT_PRESERVED;
		}

		/** @type {Derived<V>} */
		const signal = {
			ctx: component_context,
			deps: null,
			effects: null,
			equals,
			f: flags,
			fn,
			reactions: null,
			rv: 0,
			v: /** @type {V} */ (UNINITIALIZED),
			wv: 0,
			parent: parent_derived ?? active_effect,
			ac: null
		};

		return signal;
	}

	/**
	 * @template V
	 * @param {() => V | Promise<V>} fn
	 * @param {string} [label]
	 * @param {string} [location] If provided, print a warning if the value is not read immediately after update
	 * @returns {Promise<Source<V>>}
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function async_derived(fn, label, location) {
		let parent = /** @type {Effect | null} */ (active_effect);

		if (parent === null) {
			async_derived_orphan();
		}

		var promise = /** @type {Promise<V>} */ (/** @type {unknown} */ (undefined));
		var signal = source(/** @type {V} */ (UNINITIALIZED));

		// only suspend in async deriveds created on initialisation
		var should_suspend = !active_reaction;

		/** @type {Map<Batch, ReturnType<typeof deferred<V>>>} */
		var deferreds = new Map();

		async_effect(() => {

			/** @type {ReturnType<typeof deferred<V>>} */
			var d = deferred();
			promise = d.promise;

			try {
				// If this code is changed at some point, make sure to still access the then property
				// of fn() to read any signals it might access, so that we track them as dependencies.
				// We call `unset_context` to undo any `save` calls that happen inside `fn()`
				Promise.resolve(fn()).then(d.resolve, d.reject).finally(unset_context);
			} catch (error) {
				d.reject(error);
				unset_context();
			}

			var batch = /** @type {Batch} */ (current_batch);

			if (should_suspend) {
				var decrement_pending = increment_pending();

				deferreds.get(batch)?.reject(STALE_REACTION);
				deferreds.delete(batch); // delete to ensure correct order in Map iteration below
				deferreds.set(batch, d);
			}

			/**
			 * @param {any} value
			 * @param {unknown} error
			 */
			const handler = (value, error = undefined) => {

				batch.activate();

				if (error) {
					if (error !== STALE_REACTION) {
						signal.f |= ERROR_VALUE;

						// @ts-expect-error the error is the wrong type, but we don't care
						internal_set(signal, error);
					}
				} else {
					if ((signal.f & ERROR_VALUE) !== 0) {
						signal.f ^= ERROR_VALUE;
					}

					internal_set(signal, value);

					// All prior async derived runs are now stale
					for (const [b, d] of deferreds) {
						deferreds.delete(b);
						if (b === batch) break;
						d.reject(STALE_REACTION);
					}
				}

				if (decrement_pending) {
					decrement_pending();
				}
			};

			d.promise.then(handler, (e) => handler(null, e || 'unknown'));
		});

		teardown(() => {
			for (const d of deferreds.values()) {
				d.reject(STALE_REACTION);
			}
		});

		return new Promise((fulfil) => {
			/** @param {Promise<V>} p */
			function next(p) {
				function go() {
					if (p === promise) {
						fulfil(signal);
					} else {
						// if the effect re-runs before the initial promise
						// resolves, delay resolution until we have a value
						next(promise);
					}
				}

				p.then(go, go);
			}

			next(promise);
		});
	}

	/**
	 * @template V
	 * @param {() => V} fn
	 * @returns {Derived<V>}
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function user_derived(fn) {
		const d = derived(fn);

		push_reaction_value(d);

		return d;
	}

	/**
	 * @template V
	 * @param {() => V} fn
	 * @returns {Derived<V>}
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function derived_safe_equal(fn) {
		const signal = derived(fn);
		signal.equals = safe_equals;
		return signal;
	}

	/**
	 * @param {Derived} derived
	 * @returns {void}
	 */
	function destroy_derived_effects(derived) {
		var effects = derived.effects;

		if (effects !== null) {
			derived.effects = null;

			for (var i = 0; i < effects.length; i += 1) {
				destroy_effect(/** @type {Effect} */ (effects[i]));
			}
		}
	}

	/**
	 * @param {Derived} derived
	 * @returns {Effect | null}
	 */
	function get_derived_parent_effect(derived) {
		var parent = derived.parent;
		while (parent !== null) {
			if ((parent.f & DERIVED) === 0) {
				// The original parent effect might've been destroyed but the derived
				// is used elsewhere now - do not return the destroyed effect in that case
				return (parent.f & DESTROYED) === 0 ? /** @type {Effect} */ (parent) : null;
			}
			parent = parent.parent;
		}
		return null;
	}

	/**
	 * @template T
	 * @param {Derived} derived
	 * @returns {T}
	 */
	function execute_derived(derived) {
		var value;
		var prev_active_effect = active_effect;

		set_active_effect(get_derived_parent_effect(derived));

		{
			try {
				derived.f &= ~WAS_MARKED;
				destroy_derived_effects(derived);
				value = update_reaction(derived);
			} finally {
				set_active_effect(prev_active_effect);
			}
		}

		return value;
	}

	/**
	 * @param {Derived} derived
	 * @returns {void}
	 */
	function update_derived(derived) {
		var value = execute_derived(derived);

		if (!derived.equals(value)) {
			derived.wv = increment_write_version();

			// in a fork, we don't update the underlying value, just `batch_values`.
			// the underlying value will be updated when the fork is committed.
			// otherwise, the next time we get here after a 'real world' state
			// change, `derived.equals` may incorrectly return `true`
			if (!current_batch?.is_fork || derived.deps === null) {
				derived.v = value;

				// deriveds without dependencies should never be recomputed
				if (derived.deps === null) {
					set_signal_status(derived, CLEAN);
					return;
				}
			}
		}

		// don't mark derived clean if we're reading it inside a
		// cleanup function, or it will cache a stale value
		if (is_destroying_effect) {
			return;
		}

		// During time traveling we don't want to reset the status so that
		// traversal of the graph in the other batches still happens
		if (batch_values !== null) {
			// only cache the value if we're in a tracking context, otherwise we won't
			// clear the cache in `mark_reactions` when dependencies are updated
			if (effect_tracking() || current_batch?.is_fork) {
				batch_values.set(derived, value);
			}
		} else {
			update_derived_status(derived);
		}
	}

	/**
	 * @param {Derived} derived
	 */
	function freeze_derived_effects(derived) {
		if (derived.effects === null) return;

		for (const e of derived.effects) {
			// if the effect has a teardown function or abort signal, call it
			if (e.teardown || e.ac) {
				e.teardown?.();
				e.ac?.abort(STALE_REACTION);

				// make it a noop so it doesn't get called again if the derived
				// is unfrozen. we don't set it to `null`, because the existence
				// of a teardown function is what determines whether the
				// effect runs again during unfreezing
				e.teardown = noop$1;
				e.ac = null;

				remove_reactions(e, 0);
				destroy_effect_children(e);
			}
		}
	}

	/**
	 * @param {Derived} derived
	 */
	function unfreeze_derived_effects(derived) {
		if (derived.effects === null) return;

		for (const e of derived.effects) {
			// if the effect was previously frozen — indicated by the presence
			// of a teardown function — unfreeze it
			if (e.teardown) {
				update_effect(e);
			}
		}
	}

	/** @import { Derived, Effect, Source, Value } from '#client' */

	/** @type {Set<any>} */
	let eager_effects = new Set();

	/** @type {Map<Source, any>} */
	const old_values = new Map();

	let eager_effects_deferred = false;

	/**
	 * @template V
	 * @param {V} v
	 * @param {Error | null} [stack]
	 * @returns {Source<V>}
	 */
	// TODO rename this to `state` throughout the codebase
	function source(v, stack) {
		/** @type {Value} */
		var signal = {
			f: 0, // TODO ideally we could skip this altogether, but it causes type errors
			v,
			reactions: null,
			equals,
			rv: 0,
			wv: 0
		};

		return signal;
	}

	/**
	 * @template V
	 * @param {V} v
	 * @param {Error | null} [stack]
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function state(v, stack) {
		const s = source(v);

		push_reaction_value(s);

		return s;
	}

	/**
	 * @template V
	 * @param {V} initial_value
	 * @param {boolean} [immutable]
	 * @returns {Source<V>}
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function mutable_source(initial_value, immutable = false, trackable = true) {
		const s = source(initial_value);
		if (!immutable) {
			s.equals = safe_equals;
		}

		// bind the signal to the component context, in case we need to
		// track updates to trigger beforeUpdate/afterUpdate callbacks
		if (legacy_mode_flag && trackable && component_context !== null && component_context.l !== null) {
			(component_context.l.s ??= []).push(s);
		}

		return s;
	}

	/**
	 * @template V
	 * @param {Source<V>} source
	 * @param {V} value
	 * @param {boolean} [should_proxy]
	 * @returns {V}
	 */
	function set(source, value, should_proxy = false) {
		if (
			active_reaction !== null &&
			// since we are untracking the function inside `$inspect.with` we need to add this check
			// to ensure we error if state is set inside an inspect effect
			(!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) &&
			is_runes() &&
			(active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 &&
			(current_sources === null || !includes.call(current_sources, source))
		) {
			state_unsafe_mutation();
		}

		let new_value = should_proxy ? proxy(value) : value;

		return internal_set(source, new_value);
	}

	/**
	 * @template V
	 * @param {Source<V>} source
	 * @param {V} value
	 * @returns {V}
	 */
	function internal_set(source, value) {
		if (!source.equals(value)) {
			var old_value = source.v;

			if (is_destroying_effect) {
				old_values.set(source, value);
			} else {
				old_values.set(source, old_value);
			}

			source.v = value;

			var batch = Batch.ensure();
			batch.capture(source, old_value);

			if ((source.f & DERIVED) !== 0) {
				const derived = /** @type {Derived} */ (source);

				// if we are assigning to a dirty derived we set it to clean/maybe dirty but we also eagerly execute it to track the dependencies
				if ((source.f & DIRTY) !== 0) {
					execute_derived(derived);
				}

				update_derived_status(derived);
			}

			source.wv = increment_write_version();

			// For debugging, in case you want to know which reactions are being scheduled:
			// log_reactions(source);
			mark_reactions(source, DIRTY);

			// It's possible that the current reaction might not have up-to-date dependencies
			// whilst it's actively running. So in the case of ensuring it registers the reaction
			// properly for itself, we need to ensure the current effect actually gets
			// scheduled. i.e: `$effect(() => x++)`
			if (
				is_runes() &&
				active_effect !== null &&
				(active_effect.f & CLEAN) !== 0 &&
				(active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0
			) {
				if (untracked_writes === null) {
					set_untracked_writes([source]);
				} else {
					untracked_writes.push(source);
				}
			}

			if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
				flush_eager_effects();
			}
		}

		return value;
	}

	function flush_eager_effects() {
		eager_effects_deferred = false;

		for (const effect of eager_effects) {
			// Mark clean inspect-effects as maybe dirty and then check their dirtiness
			// instead of just updating the effects - this way we avoid overfiring.
			if ((effect.f & CLEAN) !== 0) {
				set_signal_status(effect, MAYBE_DIRTY);
			}

			if (is_dirty(effect)) {
				update_effect(effect);
			}
		}

		eager_effects.clear();
	}

	/**
	 * Silently (without using `get`) increment a source
	 * @param {Source<number>} source
	 */
	function increment(source) {
		set(source, source.v + 1);
	}

	/**
	 * @param {Value} signal
	 * @param {number} status should be DIRTY or MAYBE_DIRTY
	 * @returns {void}
	 */
	function mark_reactions(signal, status) {
		var reactions = signal.reactions;
		if (reactions === null) return;

		var runes = is_runes();
		var length = reactions.length;

		for (var i = 0; i < length; i++) {
			var reaction = reactions[i];
			var flags = reaction.f;

			// In legacy mode, skip the current effect to prevent infinite loops
			if (!runes && reaction === active_effect) continue;

			var not_dirty = (flags & DIRTY) === 0;

			// don't set a DIRTY reaction to MAYBE_DIRTY
			if (not_dirty) {
				set_signal_status(reaction, status);
			}

			if ((flags & DERIVED) !== 0) {
				var derived = /** @type {Derived} */ (reaction);

				batch_values?.delete(derived);

				if ((flags & WAS_MARKED) === 0) {
					// Only connected deriveds can be reliably unmarked right away
					if (flags & CONNECTED) {
						reaction.f |= WAS_MARKED;
					}

					mark_reactions(derived, MAYBE_DIRTY);
				}
			} else if (not_dirty) {
				if ((flags & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
					eager_block_effects.add(/** @type {Effect} */ (reaction));
				}

				schedule_effect(/** @type {Effect} */ (reaction));
			}
		}
	}

	/** @import { Source } from '#client' */

	/**
	 * @template T
	 * @param {T} value
	 * @returns {T}
	 */
	function proxy(value) {
		// if non-proxyable, or is already a proxy, return `value`
		if (typeof value !== 'object' || value === null || STATE_SYMBOL in value) {
			return value;
		}

		const prototype = get_prototype_of(value);

		if (prototype !== object_prototype && prototype !== array_prototype) {
			return value;
		}

		/** @type {Map<any, Source<any>>} */
		var sources = new Map();
		var is_proxied_array = is_array(value);
		var version = state(0);
		var parent_version = update_version;

		/**
		 * Executes the proxy in the context of the reaction it was originally created in, if any
		 * @template T
		 * @param {() => T} fn
		 */
		var with_parent = (fn) => {
			if (update_version === parent_version) {
				return fn();
			}

			// child source is being created after the initial proxy —
			// prevent it from being associated with the current reaction
			var reaction = active_reaction;
			var version = update_version;

			set_active_reaction(null);
			set_update_version(parent_version);

			var result = fn();

			set_active_reaction(reaction);
			set_update_version(version);

			return result;
		};

		if (is_proxied_array) {
			// We need to create the length source eagerly to ensure that
			// mutations to the array are properly synced with our proxy
			sources.set('length', state(/** @type {any[]} */ (value).length));
		}

		return new Proxy(/** @type {any} */ (value), {
			defineProperty(_, prop, descriptor) {
				if (
					!('value' in descriptor) ||
					descriptor.configurable === false ||
					descriptor.enumerable === false ||
					descriptor.writable === false
				) {
					// we disallow non-basic descriptors, because unless they are applied to the
					// target object — which we avoid, so that state can be forked — we will run
					// afoul of the various invariants
					// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/getOwnPropertyDescriptor#invariants
					state_descriptors_fixed();
				}
				var s = sources.get(prop);
				if (s === undefined) {
					with_parent(() => {
						var s = state(descriptor.value);
						sources.set(prop, s);
						return s;
					});
				} else {
					set(s, descriptor.value, true);
				}

				return true;
			},

			deleteProperty(target, prop) {
				var s = sources.get(prop);

				if (s === undefined) {
					if (prop in target) {
						const s = with_parent(() => state(UNINITIALIZED));
						sources.set(prop, s);
						increment(version);
					}
				} else {
					set(s, UNINITIALIZED);
					increment(version);
				}

				return true;
			},

			get(target, prop, receiver) {
				if (prop === STATE_SYMBOL) {
					return value;
				}

				var s = sources.get(prop);
				var exists = prop in target;

				// create a source, but only if it's an own property and not a prototype property
				if (s === undefined && (!exists || get_descriptor(target, prop)?.writable)) {
					s = with_parent(() => {
						var p = proxy(exists ? target[prop] : UNINITIALIZED);
						var s = state(p);

						return s;
					});

					sources.set(prop, s);
				}

				if (s !== undefined) {
					var v = get$1(s);
					return v === UNINITIALIZED ? undefined : v;
				}

				return Reflect.get(target, prop, receiver);
			},

			getOwnPropertyDescriptor(target, prop) {
				var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);

				if (descriptor && 'value' in descriptor) {
					var s = sources.get(prop);
					if (s) descriptor.value = get$1(s);
				} else if (descriptor === undefined) {
					var source = sources.get(prop);
					var value = source?.v;

					if (source !== undefined && value !== UNINITIALIZED) {
						return {
							enumerable: true,
							configurable: true,
							value,
							writable: true
						};
					}
				}

				return descriptor;
			},

			has(target, prop) {
				if (prop === STATE_SYMBOL) {
					return true;
				}

				var s = sources.get(prop);
				var has = (s !== undefined && s.v !== UNINITIALIZED) || Reflect.has(target, prop);

				if (
					s !== undefined ||
					(active_effect !== null && (!has || get_descriptor(target, prop)?.writable))
				) {
					if (s === undefined) {
						s = with_parent(() => {
							var p = has ? proxy(target[prop]) : UNINITIALIZED;
							var s = state(p);

							return s;
						});

						sources.set(prop, s);
					}

					var value = get$1(s);
					if (value === UNINITIALIZED) {
						return false;
					}
				}

				return has;
			},

			set(target, prop, value, receiver) {
				var s = sources.get(prop);
				var has = prop in target;

				// variable.length = value -> clear all signals with index >= value
				if (is_proxied_array && prop === 'length') {
					for (var i = value; i < /** @type {Source<number>} */ (s).v; i += 1) {
						var other_s = sources.get(i + '');
						if (other_s !== undefined) {
							set(other_s, UNINITIALIZED);
						} else if (i in target) {
							// If the item exists in the original, we need to create an uninitialized source,
							// else a later read of the property would result in a source being created with
							// the value of the original item at that index.
							other_s = with_parent(() => state(UNINITIALIZED));
							sources.set(i + '', other_s);
						}
					}
				}

				// If we haven't yet created a source for this property, we need to ensure
				// we do so otherwise if we read it later, then the write won't be tracked and
				// the heuristics of effects will be different vs if we had read the proxied
				// object property before writing to that property.
				if (s === undefined) {
					if (!has || get_descriptor(target, prop)?.writable) {
						s = with_parent(() => state(undefined));
						set(s, proxy(value));

						sources.set(prop, s);
					}
				} else {
					has = s.v !== UNINITIALIZED;

					var p = with_parent(() => proxy(value));
					set(s, p);
				}

				var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);

				// Set the new value before updating any signals so that any listeners get the new value
				if (descriptor?.set) {
					descriptor.set.call(receiver, value);
				}

				if (!has) {
					// If we have mutated an array directly, we might need to
					// signal that length has also changed. Do it before updating metadata
					// to ensure that iterating over the array as a result of a metadata update
					// will not cause the length to be out of sync.
					if (is_proxied_array && typeof prop === 'string') {
						var ls = /** @type {Source<number>} */ (sources.get('length'));
						var n = Number(prop);

						if (Number.isInteger(n) && n >= ls.v) {
							set(ls, n + 1);
						}
					}

					increment(version);
				}

				return true;
			},

			ownKeys(target) {
				get$1(version);

				var own_keys = Reflect.ownKeys(target).filter((key) => {
					var source = sources.get(key);
					return source === undefined || source.v !== UNINITIALIZED;
				});

				for (var [key, source] of sources) {
					if (source.v !== UNINITIALIZED && !(key in target)) {
						own_keys.push(key);
					}
				}

				return own_keys;
			},

			setPrototypeOf() {
				state_prototype_fixed();
			}
		});
	}

	/**
	 * @param {any} value
	 */
	function get_proxied_value(value) {
		try {
			if (value !== null && typeof value === 'object' && STATE_SYMBOL in value) {
				return value[STATE_SYMBOL];
			}
		} catch {
			// the above if check can throw an error if the value in question
			// is the contentWindow of an iframe on another domain, in which
			// case we want to just return the value (because it's definitely
			// not a proxied value) so we don't break any JavaScript interacting
			// with that iframe (such as various payment companies client side
			// JavaScript libraries interacting with their iframes on the same
			// domain)
		}

		return value;
	}

	/**
	 * @param {any} a
	 * @param {any} b
	 */
	function is(a, b) {
		return Object.is(get_proxied_value(a), get_proxied_value(b));
	}

	/**
	 * @param {any} a
	 * @param {any} b
	 * @param {boolean} equal
	 * @returns {boolean}
	 */
	function strict_equals(a, b, equal = true) {
		// try-catch needed because this tries to read properties of `a` and `b`,
		// which could be disallowed for example in a secure context
		try {
			if ((a === b) !== (get_proxied_value(a) === get_proxied_value(b))) {
				state_proxy_equality_mismatch(equal ? '===' : '!==');
			}
		} catch {}

		return (a === b) === equal;
	}

	/** @import { Effect, TemplateNode } from '#client' */

	// export these for reference in the compiled code, making global name deduplication unnecessary
	/** @type {Window} */
	var $window;

	/** @type {boolean} */
	var is_firefox;

	/** @type {() => Node | null} */
	var first_child_getter;
	/** @type {() => Node | null} */
	var next_sibling_getter;

	/**
	 * Initialize these lazily to avoid issues when using the runtime in a server context
	 * where these globals are not available while avoiding a separate server entry point
	 */
	function init_operations() {
		if ($window !== undefined) {
			return;
		}

		$window = window;
		is_firefox = /Firefox/.test(navigator.userAgent);

		var element_prototype = Element.prototype;
		var node_prototype = Node.prototype;
		var text_prototype = Text.prototype;

		// @ts-ignore
		first_child_getter = get_descriptor(node_prototype, 'firstChild').get;
		// @ts-ignore
		next_sibling_getter = get_descriptor(node_prototype, 'nextSibling').get;

		if (is_extensible(element_prototype)) {
			// the following assignments improve perf of lookups on DOM nodes
			// @ts-expect-error
			element_prototype.__click = undefined;
			// @ts-expect-error
			element_prototype.__className = undefined;
			// @ts-expect-error
			element_prototype.__attributes = null;
			// @ts-expect-error
			element_prototype.__style = undefined;
			// @ts-expect-error
			element_prototype.__e = undefined;
		}

		if (is_extensible(text_prototype)) {
			// @ts-expect-error
			text_prototype.__t = undefined;
		}
	}

	/**
	 * @param {string} value
	 * @returns {Text}
	 */
	function create_text(value = '') {
		return document.createTextNode(value);
	}

	/**
	 * @template {Node} N
	 * @param {N} node
	 */
	/*@__NO_SIDE_EFFECTS__*/
	function get_first_child(node) {
		return /** @type {TemplateNode | null} */ (first_child_getter.call(node));
	}

	/**
	 * @template {Node} N
	 * @param {N} node
	 */
	/*@__NO_SIDE_EFFECTS__*/
	function get_next_sibling(node) {
		return /** @type {TemplateNode | null} */ (next_sibling_getter.call(node));
	}

	/**
	 * Don't mark this as side-effect-free, hydration needs to walk all nodes
	 * @template {Node} N
	 * @param {N} node
	 * @param {boolean} is_text
	 * @returns {TemplateNode | null}
	 */
	function child(node, is_text) {
		{
			return get_first_child(node);
		}
	}

	/**
	 * Don't mark this as side-effect-free, hydration needs to walk all nodes
	 * @param {TemplateNode} node
	 * @param {boolean} [is_text]
	 * @returns {TemplateNode | null}
	 */
	function first_child(node, is_text = false) {
		{
			var first = get_first_child(node);

			// TODO prevent user comments with the empty string when preserveComments is true
			if (first instanceof Comment && first.data === '') return get_next_sibling(first);

			return first;
		}
	}

	/**
	 * Don't mark this as side-effect-free, hydration needs to walk all nodes
	 * @param {TemplateNode} node
	 * @param {number} count
	 * @param {boolean} is_text
	 * @returns {TemplateNode | null}
	 */
	function sibling(node, count = 1, is_text = false) {
		let next_sibling = node;

		while (count--) {
			next_sibling = /** @type {TemplateNode} */ (get_next_sibling(next_sibling));
		}

		{
			return next_sibling;
		}
	}

	/**
	 * @template {Node} N
	 * @param {N} node
	 * @returns {void}
	 */
	function clear_text_content(node) {
		node.textContent = '';
	}

	/**
	 * Returns `true` if we're updating the current block, for example `condition` in
	 * an `{#if condition}` block just changed. In this case, the branch should be
	 * appended (or removed) at the same time as other updates within the
	 * current `<svelte:boundary>`
	 */
	function should_defer_append() {
		return false;
	}

	/**
	 * @template {keyof HTMLElementTagNameMap | string} T
	 * @param {T} tag
	 * @param {string} [namespace]
	 * @param {string} [is]
	 * @returns {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element}
	 */
	function create_element(tag, namespace, is) {
		let options = undefined;
		return /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */ (
			document.createElementNS(NAMESPACE_HTML, tag, options)
		);
	}

	/**
	 * @param {HTMLElement} dom
	 * @param {boolean} value
	 * @returns {void}
	 */
	function autofocus(dom, value) {
		if (value) {
			const body = document.body;
			dom.autofocus = true;

			queue_micro_task(() => {
				if (document.activeElement === body) {
					dom.focus();
				}
			});
		}
	}

	/**
	 * @template T
	 * @param {() => T} fn
	 */
	function without_reactive_context(fn) {
		var previous_reaction = active_reaction;
		var previous_effect = active_effect;
		set_active_reaction(null);
		set_active_effect(null);
		try {
			return fn();
		} finally {
			set_active_reaction(previous_reaction);
			set_active_effect(previous_effect);
		}
	}

	/** @import { Blocker, ComponentContext, ComponentContextLegacy, Derived, Effect, TemplateNode, TransitionManager } from '#client' */

	/**
	 * @param {'$effect' | '$effect.pre' | '$inspect'} rune
	 */
	function validate_effect(rune) {
		if (active_effect === null) {
			if (active_reaction === null) {
				effect_orphan();
			}

			effect_in_unowned_derived();
		}

		if (is_destroying_effect) {
			effect_in_teardown();
		}
	}

	/**
	 * @param {Effect} effect
	 * @param {Effect} parent_effect
	 */
	function push_effect(effect, parent_effect) {
		var parent_last = parent_effect.last;
		if (parent_last === null) {
			parent_effect.last = parent_effect.first = effect;
		} else {
			parent_last.next = effect;
			effect.prev = parent_last;
			parent_effect.last = effect;
		}
	}

	/**
	 * @param {number} type
	 * @param {null | (() => void | (() => void))} fn
	 * @returns {Effect}
	 */
	function create_effect(type, fn) {
		var parent = active_effect;

		if (parent !== null && (parent.f & INERT) !== 0) {
			type |= INERT;
		}

		/** @type {Effect} */
		var effect = {
			ctx: component_context,
			deps: null,
			nodes: null,
			f: type | DIRTY | CONNECTED,
			first: null,
			fn,
			last: null,
			next: null,
			parent,
			b: parent && parent.b,
			prev: null,
			teardown: null,
			wv: 0,
			ac: null
		};

		/** @type {Effect | null} */
		var e = effect;

		if ((type & EFFECT) !== 0) {
			if (collected_effects !== null) {
				// created during traversal — collect and run afterwards
				collected_effects.push(effect);
			} else {
				// schedule for later
				schedule_effect(effect);
			}
		} else if (fn !== null) {
			try {
				update_effect(effect);
			} catch (e) {
				destroy_effect(effect);
				throw e;
			}

			// if an effect doesn't need to be kept in the tree (because it
			// won't re-run, has no DOM, and has no teardown etc)
			// then we skip it and go to its child (if any)
			if (
				e.deps === null &&
				e.teardown === null &&
				e.nodes === null &&
				e.first === e.last && // either `null`, or a singular child
				(e.f & EFFECT_PRESERVED) === 0
			) {
				e = e.first;
				if ((type & BLOCK_EFFECT) !== 0 && (type & EFFECT_TRANSPARENT) !== 0 && e !== null) {
					e.f |= EFFECT_TRANSPARENT;
				}
			}
		}

		if (e !== null) {
			e.parent = parent;

			if (parent !== null) {
				push_effect(e, parent);
			}

			// if we're in a derived, add the effect there too
			if (
				active_reaction !== null &&
				(active_reaction.f & DERIVED) !== 0 &&
				(type & ROOT_EFFECT) === 0
			) {
				var derived = /** @type {Derived} */ (active_reaction);
				(derived.effects ??= []).push(e);
			}
		}

		return effect;
	}

	/**
	 * Internal representation of `$effect.tracking()`
	 * @returns {boolean}
	 */
	function effect_tracking() {
		return active_reaction !== null && !untracking;
	}

	/**
	 * @param {() => void} fn
	 */
	function teardown(fn) {
		const effect = create_effect(RENDER_EFFECT, null);
		set_signal_status(effect, CLEAN);
		effect.teardown = fn;
		return effect;
	}

	/**
	 * Internal representation of `$effect(...)`
	 * @param {() => void | (() => void)} fn
	 */
	function user_effect(fn) {
		validate_effect();

		// Non-nested `$effect(...)` in a component should be deferred
		// until the component is mounted
		var flags = /** @type {Effect} */ (active_effect).f;
		var defer = !active_reaction && (flags & BRANCH_EFFECT) !== 0 && (flags & REACTION_RAN) === 0;

		if (defer) {
			// Top-level `$effect(...)` in an unmounted component — defer until mount
			var context = /** @type {ComponentContext} */ (component_context);
			(context.e ??= []).push(fn);
		} else {
			// Everything else — create immediately
			return create_user_effect(fn);
		}
	}

	/**
	 * @param {() => void | (() => void)} fn
	 */
	function create_user_effect(fn) {
		return create_effect(EFFECT | USER_EFFECT, fn);
	}

	/**
	 * Internal representation of `$effect.pre(...)`
	 * @param {() => void | (() => void)} fn
	 * @returns {Effect}
	 */
	function user_pre_effect(fn) {
		validate_effect();
		return create_effect(RENDER_EFFECT | USER_EFFECT, fn);
	}

	/**
	 * An effect root whose children can transition out
	 * @param {() => void} fn
	 * @returns {(options?: { outro?: boolean }) => Promise<void>}
	 */
	function component_root(fn) {
		Batch.ensure();
		const effect = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);

		return (options = {}) => {
			return new Promise((fulfil) => {
				if (options.outro) {
					pause_effect(effect, () => {
						destroy_effect(effect);
						fulfil(undefined);
					});
				} else {
					destroy_effect(effect);
					fulfil(undefined);
				}
			});
		};
	}

	/**
	 * @param {() => void | (() => void)} fn
	 * @returns {Effect}
	 */
	function effect(fn) {
		return create_effect(EFFECT, fn);
	}

	/**
	 * @param {() => void | (() => void)} fn
	 * @returns {Effect}
	 */
	function async_effect(fn) {
		return create_effect(ASYNC | EFFECT_PRESERVED, fn);
	}

	/**
	 * @param {() => void | (() => void)} fn
	 * @returns {Effect}
	 */
	function render_effect(fn, flags = 0) {
		return create_effect(RENDER_EFFECT | flags, fn);
	}

	/**
	 * @param {(...expressions: any) => void | (() => void)} fn
	 * @param {Array<() => any>} sync
	 * @param {Array<() => Promise<any>>} async
	 * @param {Blocker[]} blockers
	 */
	function template_effect(fn, sync = [], async = [], blockers = []) {
		flatten(blockers, sync, async, (values) => {
			create_effect(RENDER_EFFECT, () => fn(...values.map(get$1)));
		});
	}

	/**
	 * @param {(() => void)} fn
	 * @param {number} flags
	 */
	function block(fn, flags = 0) {
		var effect = create_effect(BLOCK_EFFECT | flags, fn);
		return effect;
	}

	/**
	 * @param {(() => void)} fn
	 * @param {number} flags
	 */
	function managed(fn, flags = 0) {
		var effect = create_effect(MANAGED_EFFECT | flags, fn);
		return effect;
	}

	/**
	 * @param {(() => void)} fn
	 */
	function branch(fn) {
		return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn);
	}

	/**
	 * @param {Effect} effect
	 */
	function execute_effect_teardown(effect) {
		var teardown = effect.teardown;
		if (teardown !== null) {
			const previously_destroying_effect = is_destroying_effect;
			const previous_reaction = active_reaction;
			set_is_destroying_effect(true);
			set_active_reaction(null);
			try {
				teardown.call(null);
			} finally {
				set_is_destroying_effect(previously_destroying_effect);
				set_active_reaction(previous_reaction);
			}
		}
	}

	/**
	 * @param {Effect} signal
	 * @param {boolean} remove_dom
	 * @returns {void}
	 */
	function destroy_effect_children(signal, remove_dom = false) {
		var effect = signal.first;
		signal.first = signal.last = null;

		while (effect !== null) {
			const controller = effect.ac;

			if (controller !== null) {
				without_reactive_context(() => {
					controller.abort(STALE_REACTION);
				});
			}

			var next = effect.next;

			if ((effect.f & ROOT_EFFECT) !== 0) {
				// this is now an independent root
				effect.parent = null;
			} else {
				destroy_effect(effect, remove_dom);
			}

			effect = next;
		}
	}

	/**
	 * @param {Effect} signal
	 * @returns {void}
	 */
	function destroy_block_effect_children(signal) {
		var effect = signal.first;

		while (effect !== null) {
			var next = effect.next;
			if ((effect.f & BRANCH_EFFECT) === 0) {
				destroy_effect(effect);
			}
			effect = next;
		}
	}

	/**
	 * @param {Effect} effect
	 * @param {boolean} [remove_dom]
	 * @returns {void}
	 */
	function destroy_effect(effect, remove_dom = true) {
		var removed = false;

		if (
			(remove_dom || (effect.f & HEAD_EFFECT) !== 0) &&
			effect.nodes !== null &&
			effect.nodes.end !== null
		) {
			remove_effect_dom(effect.nodes.start, /** @type {TemplateNode} */ (effect.nodes.end));
			removed = true;
		}

		destroy_effect_children(effect, remove_dom && !removed);
		remove_reactions(effect, 0);
		set_signal_status(effect, DESTROYED);

		var transitions = effect.nodes && effect.nodes.t;

		if (transitions !== null) {
			for (const transition of transitions) {
				transition.stop();
			}
		}

		execute_effect_teardown(effect);

		var parent = effect.parent;

		// If the parent doesn't have any children, then skip this work altogether
		if (parent !== null && parent.first !== null) {
			unlink_effect(effect);
		}

		// `first` and `child` are nulled out in destroy_effect_children
		// we don't null out `parent` so that error propagation can work correctly
		effect.next =
			effect.prev =
			effect.teardown =
			effect.ctx =
			effect.deps =
			effect.fn =
			effect.nodes =
			effect.ac =
				null;
	}

	/**
	 *
	 * @param {TemplateNode | null} node
	 * @param {TemplateNode} end
	 */
	function remove_effect_dom(node, end) {
		while (node !== null) {
			/** @type {TemplateNode | null} */
			var next = node === end ? null : get_next_sibling(node);

			node.remove();
			node = next;
		}
	}

	/**
	 * Detach an effect from the effect tree, freeing up memory and
	 * reducing the amount of work that happens on subsequent traversals
	 * @param {Effect} effect
	 */
	function unlink_effect(effect) {
		var parent = effect.parent;
		var prev = effect.prev;
		var next = effect.next;

		if (prev !== null) prev.next = next;
		if (next !== null) next.prev = prev;

		if (parent !== null) {
			if (parent.first === effect) parent.first = next;
			if (parent.last === effect) parent.last = prev;
		}
	}

	/**
	 * When a block effect is removed, we don't immediately destroy it or yank it
	 * out of the DOM, because it might have transitions. Instead, we 'pause' it.
	 * It stays around (in memory, and in the DOM) until outro transitions have
	 * completed, and if the state change is reversed then we _resume_ it.
	 * A paused effect does not update, and the DOM subtree becomes inert.
	 * @param {Effect} effect
	 * @param {() => void} [callback]
	 * @param {boolean} [destroy]
	 */
	function pause_effect(effect, callback, destroy = true) {
		/** @type {TransitionManager[]} */
		var transitions = [];

		pause_children(effect, transitions, true);

		var fn = () => {
			if (destroy) destroy_effect(effect);
			if (callback) callback();
		};

		var remaining = transitions.length;
		if (remaining > 0) {
			var check = () => --remaining || fn();
			for (var transition of transitions) {
				transition.out(check);
			}
		} else {
			fn();
		}
	}

	/**
	 * @param {Effect} effect
	 * @param {TransitionManager[]} transitions
	 * @param {boolean} local
	 */
	function pause_children(effect, transitions, local) {
		if ((effect.f & INERT) !== 0) return;
		effect.f ^= INERT;

		var t = effect.nodes && effect.nodes.t;

		if (t !== null) {
			for (const transition of t) {
				if (transition.is_global || local) {
					transitions.push(transition);
				}
			}
		}

		var child = effect.first;

		while (child !== null) {
			var sibling = child.next;
			var transparent =
				(child.f & EFFECT_TRANSPARENT) !== 0 ||
				// If this is a branch effect without a block effect parent,
				// it means the parent block effect was pruned. In that case,
				// transparency information was transferred to the branch effect.
				((child.f & BRANCH_EFFECT) !== 0 && (effect.f & BLOCK_EFFECT) !== 0);
			// TODO we don't need to call pause_children recursively with a linked list in place
			// it's slightly more involved though as we have to account for `transparent` changing
			// through the tree.
			pause_children(child, transitions, transparent ? local : false);
			child = sibling;
		}
	}

	/**
	 * The opposite of `pause_effect`. We call this if (for example)
	 * `x` becomes falsy then truthy: `{#if x}...{/if}`
	 * @param {Effect} effect
	 */
	function resume_effect(effect) {
		resume_children(effect, true);
	}

	/**
	 * @param {Effect} effect
	 * @param {boolean} local
	 */
	function resume_children(effect, local) {
		if ((effect.f & INERT) === 0) return;
		effect.f ^= INERT;

		var child = effect.first;

		while (child !== null) {
			var sibling = child.next;
			var transparent = (child.f & EFFECT_TRANSPARENT) !== 0 || (child.f & BRANCH_EFFECT) !== 0;
			// TODO we don't need to call resume_children recursively with a linked list in place
			// it's slightly more involved though as we have to account for `transparent` changing
			// through the tree.
			resume_children(child, transparent ? local : false);
			child = sibling;
		}

		var t = effect.nodes && effect.nodes.t;

		if (t !== null) {
			for (const transition of t) {
				if (transition.is_global || local) {
					transition.in();
				}
			}
		}
	}

	/**
	 * @param {Effect} effect
	 * @param {DocumentFragment} fragment
	 */
	function move_effect(effect, fragment) {
		if (!effect.nodes) return;

		/** @type {TemplateNode | null} */
		var node = effect.nodes.start;
		var end = effect.nodes.end;

		while (node !== null) {
			/** @type {TemplateNode | null} */
			var next = node === end ? null : get_next_sibling(node);

			fragment.append(node);
			node = next;
		}
	}

	/** @import { Derived, Effect, Reaction, Source, Value } from '#client' */

	let is_updating_effect = false;

	let is_destroying_effect = false;

	/** @param {boolean} value */
	function set_is_destroying_effect(value) {
		is_destroying_effect = value;
	}

	/** @type {null | Reaction} */
	let active_reaction = null;

	let untracking = false;

	/** @param {null | Reaction} reaction */
	function set_active_reaction(reaction) {
		active_reaction = reaction;
	}

	/** @type {null | Effect} */
	let active_effect = null;

	/** @param {null | Effect} effect */
	function set_active_effect(effect) {
		active_effect = effect;
	}

	/**
	 * When sources are created within a reaction, reading and writing
	 * them within that reaction should not cause a re-run
	 * @type {null | Source[]}
	 */
	let current_sources = null;

	/** @param {Value} value */
	function push_reaction_value(value) {
		if (active_reaction !== null && (true)) {
			if (current_sources === null) {
				current_sources = [value];
			} else {
				current_sources.push(value);
			}
		}
	}

	/**
	 * The dependencies of the reaction that is currently being executed. In many cases,
	 * the dependencies are unchanged between runs, and so this will be `null` unless
	 * and until a new dependency is accessed — we track this via `skipped_deps`
	 * @type {null | Value[]}
	 */
	let new_deps = null;

	let skipped_deps = 0;

	/**
	 * Tracks writes that the effect it's executed in doesn't listen to yet,
	 * so that the dependency can be added to the effect later on if it then reads it
	 * @type {null | Source[]}
	 */
	let untracked_writes = null;

	/** @param {null | Source[]} value */
	function set_untracked_writes(value) {
		untracked_writes = value;
	}

	/**
	 * @type {number} Used by sources and deriveds for handling updates.
	 * Version starts from 1 so that unowned deriveds differentiate between a created effect and a run one for tracing
	 **/
	let write_version = 1;

	/** @type {number} Used to version each read of a source of derived to avoid duplicating depedencies inside a reaction */
	let read_version = 0;

	let update_version = read_version;

	/** @param {number} value */
	function set_update_version(value) {
		update_version = value;
	}

	function increment_write_version() {
		return ++write_version;
	}

	/**
	 * Determines whether a derived or effect is dirty.
	 * If it is MAYBE_DIRTY, will set the status to CLEAN
	 * @param {Reaction} reaction
	 * @returns {boolean}
	 */
	function is_dirty(reaction) {
		var flags = reaction.f;

		if ((flags & DIRTY) !== 0) {
			return true;
		}

		if (flags & DERIVED) {
			reaction.f &= ~WAS_MARKED;
		}

		if ((flags & MAYBE_DIRTY) !== 0) {
			var dependencies = /** @type {Value[]} */ (reaction.deps);
			var length = dependencies.length;

			for (var i = 0; i < length; i++) {
				var dependency = dependencies[i];

				if (is_dirty(/** @type {Derived} */ (dependency))) {
					update_derived(/** @type {Derived} */ (dependency));
				}

				if (dependency.wv > reaction.wv) {
					return true;
				}
			}

			if (
				(flags & CONNECTED) !== 0 &&
				// During time traveling we don't want to reset the status so that
				// traversal of the graph in the other batches still happens
				batch_values === null
			) {
				set_signal_status(reaction, CLEAN);
			}
		}

		return false;
	}

	/**
	 * @param {Value} signal
	 * @param {Effect} effect
	 * @param {boolean} [root]
	 */
	function schedule_possible_effect_self_invalidation(signal, effect, root = true) {
		var reactions = signal.reactions;
		if (reactions === null) return;

		if (current_sources !== null && includes.call(current_sources, signal)) {
			return;
		}

		for (var i = 0; i < reactions.length; i++) {
			var reaction = reactions[i];

			if ((reaction.f & DERIVED) !== 0) {
				schedule_possible_effect_self_invalidation(/** @type {Derived} */ (reaction), effect, false);
			} else if (effect === reaction) {
				if (root) {
					set_signal_status(reaction, DIRTY);
				} else if ((reaction.f & CLEAN) !== 0) {
					set_signal_status(reaction, MAYBE_DIRTY);
				}
				schedule_effect(/** @type {Effect} */ (reaction));
			}
		}
	}

	/** @param {Reaction} reaction */
	function update_reaction(reaction) {
		var previous_deps = new_deps;
		var previous_skipped_deps = skipped_deps;
		var previous_untracked_writes = untracked_writes;
		var previous_reaction = active_reaction;
		var previous_sources = current_sources;
		var previous_component_context = component_context;
		var previous_untracking = untracking;
		var previous_update_version = update_version;

		var flags = reaction.f;

		new_deps = /** @type {null | Value[]} */ (null);
		skipped_deps = 0;
		untracked_writes = null;
		active_reaction = (flags & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;

		current_sources = null;
		set_component_context(reaction.ctx);
		untracking = false;
		update_version = ++read_version;

		if (reaction.ac !== null) {
			without_reactive_context(() => {
				/** @type {AbortController} */ (reaction.ac).abort(STALE_REACTION);
			});

			reaction.ac = null;
		}

		try {
			reaction.f |= REACTION_IS_UPDATING;
			var fn = /** @type {Function} */ (reaction.fn);
			var result = fn();
			reaction.f |= REACTION_RAN;
			var deps = reaction.deps;

			// Don't remove reactions during fork;
			// they must remain for when fork is discarded
			var is_fork = current_batch?.is_fork;

			if (new_deps !== null) {
				var i;

				if (!is_fork) {
					remove_reactions(reaction, skipped_deps);
				}

				if (deps !== null && skipped_deps > 0) {
					deps.length = skipped_deps + new_deps.length;
					for (i = 0; i < new_deps.length; i++) {
						deps[skipped_deps + i] = new_deps[i];
					}
				} else {
					reaction.deps = deps = new_deps;
				}

				if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
					for (i = skipped_deps; i < deps.length; i++) {
						(deps[i].reactions ??= []).push(reaction);
					}
				}
			} else if (!is_fork && deps !== null && skipped_deps < deps.length) {
				remove_reactions(reaction, skipped_deps);
				deps.length = skipped_deps;
			}

			// If we're inside an effect and we have untracked writes, then we need to
			// ensure that if any of those untracked writes result in re-invalidation
			// of the current effect, then that happens accordingly
			if (
				is_runes() &&
				untracked_writes !== null &&
				!untracking &&
				deps !== null &&
				(reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0
			) {
				for (i = 0; i < /** @type {Source[]} */ (untracked_writes).length; i++) {
					schedule_possible_effect_self_invalidation(
						untracked_writes[i],
						/** @type {Effect} */ (reaction)
					);
				}
			}

			// If we are returning to an previous reaction then
			// we need to increment the read version to ensure that
			// any dependencies in this reaction aren't marked with
			// the same version
			if (previous_reaction !== null && previous_reaction !== reaction) {
				read_version++;

				// update the `rv` of the previous reaction's deps — both existing and new —
				// so that they are not added again
				if (previous_reaction.deps !== null) {
					for (let i = 0; i < previous_skipped_deps; i += 1) {
						previous_reaction.deps[i].rv = read_version;
					}
				}

				if (previous_deps !== null) {
					for (const dep of previous_deps) {
						dep.rv = read_version;
					}
				}

				if (untracked_writes !== null) {
					if (previous_untracked_writes === null) {
						previous_untracked_writes = untracked_writes;
					} else {
						previous_untracked_writes.push(.../** @type {Source[]} */ (untracked_writes));
					}
				}
			}

			if ((reaction.f & ERROR_VALUE) !== 0) {
				reaction.f ^= ERROR_VALUE;
			}

			return result;
		} catch (error) {
			return handle_error(error);
		} finally {
			reaction.f ^= REACTION_IS_UPDATING;
			new_deps = previous_deps;
			skipped_deps = previous_skipped_deps;
			untracked_writes = previous_untracked_writes;
			active_reaction = previous_reaction;
			current_sources = previous_sources;
			set_component_context(previous_component_context);
			untracking = previous_untracking;
			update_version = previous_update_version;
		}
	}

	/**
	 * @template V
	 * @param {Reaction} signal
	 * @param {Value<V>} dependency
	 * @returns {void}
	 */
	function remove_reaction(signal, dependency) {
		let reactions = dependency.reactions;
		if (reactions !== null) {
			var index = index_of.call(reactions, signal);
			if (index !== -1) {
				var new_length = reactions.length - 1;
				if (new_length === 0) {
					reactions = dependency.reactions = null;
				} else {
					// Swap with last element and then remove.
					reactions[index] = reactions[new_length];
					reactions.pop();
				}
			}
		}

		// If the derived has no reactions, then we can disconnect it from the graph,
		// allowing it to either reconnect in the future, or be GC'd by the VM.
		if (
			reactions === null &&
			(dependency.f & DERIVED) !== 0 &&
			// Destroying a child effect while updating a parent effect can cause a dependency to appear
			// to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
			// allows us to skip the expensive work of disconnecting and immediately reconnecting it
			(new_deps === null || !includes.call(new_deps, dependency))
		) {
			var derived = /** @type {Derived} */ (dependency);

			// If we are working with a derived that is owned by an effect, then mark it as being
			// disconnected and remove the mark flag, as it cannot be reliably removed otherwise
			if ((derived.f & CONNECTED) !== 0) {
				derived.f ^= CONNECTED;
				derived.f &= ~WAS_MARKED;
			}

			update_derived_status(derived);

			// freeze any effects inside this derived
			freeze_derived_effects(derived);

			// Disconnect any reactions owned by this reaction
			remove_reactions(derived, 0);
		}
	}

	/**
	 * @param {Reaction} signal
	 * @param {number} start_index
	 * @returns {void}
	 */
	function remove_reactions(signal, start_index) {
		var dependencies = signal.deps;
		if (dependencies === null) return;

		for (var i = start_index; i < dependencies.length; i++) {
			remove_reaction(signal, dependencies[i]);
		}
	}

	/**
	 * @param {Effect} effect
	 * @returns {void}
	 */
	function update_effect(effect) {
		var flags = effect.f;

		if ((flags & DESTROYED) !== 0) {
			return;
		}

		set_signal_status(effect, CLEAN);

		var previous_effect = active_effect;
		var was_updating_effect = is_updating_effect;

		active_effect = effect;
		is_updating_effect = true;

		try {
			if ((flags & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
				destroy_block_effect_children(effect);
			} else {
				destroy_effect_children(effect);
			}

			execute_effect_teardown(effect);
			var teardown = update_reaction(effect);
			effect.teardown = typeof teardown === 'function' ? teardown : null;
			effect.wv = write_version;

			// In DEV, increment versions of any sources that were written to during the effect,
			// so that they are correctly marked as dirty when the effect re-runs
			var dep; if (DEV && tracing_mode_flag && (effect.f & DIRTY) !== 0 && effect.deps !== null) ;
		} finally {
			is_updating_effect = was_updating_effect;
			active_effect = previous_effect;
		}
	}

	/**
	 * @template V
	 * @param {Value<V>} signal
	 * @returns {V}
	 */
	function get$1(signal) {
		var flags = signal.f;
		var is_derived = (flags & DERIVED) !== 0;

		// Register the dependency on the current reaction signal.
		if (active_reaction !== null && !untracking) {
			// if we're in a derived that is being read inside an _async_ derived,
			// it's possible that the effect was already destroyed. In this case,
			// we don't add the dependency, because that would create a memory leak
			var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;

			if (!destroyed && (current_sources === null || !includes.call(current_sources, signal))) {
				var deps = active_reaction.deps;

				if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
					// we're in the effect init/update cycle
					if (signal.rv < read_version) {
						signal.rv = read_version;

						// If the signal is accessing the same dependencies in the same
						// order as it did last time, increment `skipped_deps`
						// rather than updating `new_deps`, which creates GC cost
						if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
							skipped_deps++;
						} else if (new_deps === null) {
							new_deps = [signal];
						} else {
							new_deps.push(signal);
						}
					}
				} else {
					// we're adding a dependency outside the init/update cycle
					// (i.e. after an `await`)
					(active_reaction.deps ??= []).push(signal);

					var reactions = signal.reactions;

					if (reactions === null) {
						signal.reactions = [active_reaction];
					} else if (!includes.call(reactions, active_reaction)) {
						reactions.push(active_reaction);
					}
				}
			}
		}

		if (is_destroying_effect && old_values.has(signal)) {
			return old_values.get(signal);
		}

		if (is_derived) {
			var derived = /** @type {Derived} */ (signal);

			if (is_destroying_effect) {
				var value = derived.v;

				// if the derived is dirty and has reactions, or depends on the values that just changed, re-execute
				// (a derived can be maybe_dirty due to the effect destroy removing its last reaction)
				if (
					((derived.f & CLEAN) === 0 && derived.reactions !== null) ||
					depends_on_old_values(derived)
				) {
					value = execute_derived(derived);
				}

				old_values.set(derived, value);

				return value;
			}

			// connect disconnected deriveds if we are reading them inside an effect,
			// or inside another derived that is already connected
			var should_connect =
				(derived.f & CONNECTED) === 0 &&
				!untracking &&
				active_reaction !== null &&
				(is_updating_effect || (active_reaction.f & CONNECTED) !== 0);

			var is_new = (derived.f & REACTION_RAN) === 0;

			if (is_dirty(derived)) {
				if (should_connect) {
					// set the flag before `update_derived`, so that the derived
					// is added as a reaction to its dependencies
					derived.f |= CONNECTED;
				}

				update_derived(derived);
			}

			if (should_connect && !is_new) {
				unfreeze_derived_effects(derived);
				reconnect(derived);
			}
		}

		if (batch_values?.has(signal)) {
			return batch_values.get(signal);
		}

		if ((signal.f & ERROR_VALUE) !== 0) {
			throw signal.v;
		}

		return signal.v;
	}

	/**
	 * (Re)connect a disconnected derived, so that it is notified
	 * of changes in `mark_reactions`
	 * @param {Derived} derived
	 */
	function reconnect(derived) {
		derived.f |= CONNECTED;

		if (derived.deps === null) return;

		for (const dep of derived.deps) {
			(dep.reactions ??= []).push(derived);

			if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
				unfreeze_derived_effects(/** @type {Derived} */ (dep));
				reconnect(/** @type {Derived} */ (dep));
			}
		}
	}

	/** @param {Derived} derived */
	function depends_on_old_values(derived) {
		if (derived.v === UNINITIALIZED) return true; // we don't know, so assume the worst
		if (derived.deps === null) return false;

		for (const dep of derived.deps) {
			if (old_values.has(dep)) {
				return true;
			}

			if ((dep.f & DERIVED) !== 0 && depends_on_old_values(/** @type {Derived} */ (dep))) {
				return true;
			}
		}

		return false;
	}

	/**
	 * When used inside a [`$derived`](https://svelte.dev/docs/svelte/$derived) or [`$effect`](https://svelte.dev/docs/svelte/$effect),
	 * any state read inside `fn` will not be treated as a dependency.
	 *
	 * ```ts
	 * $effect(() => {
	 *   // this will run when `data` changes, but not when `time` changes
	 *   save(data, {
	 *     timestamp: untrack(() => time)
	 *   });
	 * });
	 * ```
	 * @template T
	 * @param {() => T} fn
	 * @returns {T}
	 */
	function untrack(fn) {
		var previous_untracking = untracking;
		try {
			untracking = true;
			return fn();
		} finally {
			untracking = previous_untracking;
		}
	}

	/**
	 * Possibly traverse an object and read all its properties so that they're all reactive in case this is `$state`.
	 * Does only check first level of an object for performance reasons (heuristic should be good for 99% of all cases).
	 * @param {any} value
	 * @returns {void}
	 */
	function deep_read_state(value) {
		if (typeof value !== 'object' || !value || value instanceof EventTarget) {
			return;
		}

		if (STATE_SYMBOL in value) {
			deep_read(value);
		} else if (!Array.isArray(value)) {
			for (let key in value) {
				const prop = value[key];
				if (typeof prop === 'object' && prop && STATE_SYMBOL in prop) {
					deep_read(prop);
				}
			}
		}
	}

	/**
	 * Deeply traverse an object and read all its properties
	 * so that they're all reactive in case this is `$state`
	 * @param {any} value
	 * @param {Set<any>} visited
	 * @returns {void}
	 */
	function deep_read(value, visited = new Set()) {
		if (
			typeof value === 'object' &&
			value !== null &&
			// We don't want to traverse DOM elements
			!(value instanceof EventTarget) &&
			!visited.has(value)
		) {
			visited.add(value);
			// When working with a possible SvelteDate, this
			// will ensure we capture changes to it.
			if (value instanceof Date) {
				value.getTime();
			}
			for (let key in value) {
				try {
					deep_read(value[key], visited);
				} catch (e) {
					// continue
				}
			}
			const proto = get_prototype_of(value);
			if (
				proto !== Object.prototype &&
				proto !== Array.prototype &&
				proto !== Map.prototype &&
				proto !== Set.prototype &&
				proto !== Date.prototype
			) {
				const descriptors = get_descriptors(proto);
				for (let key in descriptors) {
					const get = descriptors[key].get;
					if (get) {
						try {
							get.call(value);
						} catch (e) {
							// continue
						}
					}
				}
			}
		}
	}

	/**
	 * @param {string} name
	 */
	function is_capture_event(name) {
		return name.endsWith('capture') && name !== 'gotpointercapture' && name !== 'lostpointercapture';
	}

	/** List of Element events that will be delegated */
	const DELEGATED_EVENTS = [
		'beforeinput',
		'click',
		'change',
		'dblclick',
		'contextmenu',
		'focusin',
		'focusout',
		'input',
		'keydown',
		'keyup',
		'mousedown',
		'mousemove',
		'mouseout',
		'mouseover',
		'mouseup',
		'pointerdown',
		'pointermove',
		'pointerout',
		'pointerover',
		'pointerup',
		'touchend',
		'touchmove',
		'touchstart'
	];

	/**
	 * Returns `true` if `event_name` is a delegated event
	 * @param {string} event_name
	 */
	function can_delegate_event(event_name) {
		return DELEGATED_EVENTS.includes(event_name);
	}

	/**
	 * @type {Record<string, string>}
	 * List of attribute names that should be aliased to their property names
	 * because they behave differently between setting them as an attribute and
	 * setting them as a property.
	 */
	const ATTRIBUTE_ALIASES = {
		// no `class: 'className'` because we handle that separately
		formnovalidate: 'formNoValidate',
		ismap: 'isMap',
		nomodule: 'noModule',
		playsinline: 'playsInline',
		readonly: 'readOnly',
		defaultvalue: 'defaultValue',
		defaultchecked: 'defaultChecked',
		srcobject: 'srcObject',
		novalidate: 'noValidate',
		allowfullscreen: 'allowFullscreen',
		disablepictureinpicture: 'disablePictureInPicture',
		disableremoteplayback: 'disableRemotePlayback'
	};

	/**
	 * @param {string} name
	 */
	function normalize_attribute(name) {
		name = name.toLowerCase();
		return ATTRIBUTE_ALIASES[name] ?? name;
	}

	/**
	 * Subset of delegated events which should be passive by default.
	 * These two are already passive via browser defaults on window, document and body.
	 * But since
	 * - we're delegating them
	 * - they happen often
	 * - they apply to mobile which is generally less performant
	 * we're marking them as passive by default for other elements, too.
	 */
	const PASSIVE_EVENTS = ['touchstart', 'touchmove'];

	/**
	 * Returns `true` if `name` is a passive event
	 * @param {string} name
	 */
	function is_passive_event(name) {
		return PASSIVE_EVENTS.includes(name);
	}

	/** @import { SourceLocation } from '#client' */

	/**
	 * @param {any} fn
	 * @param {string} filename
	 * @param {SourceLocation[]} locations
	 * @returns {any}
	 */
	function add_locations(fn, filename, locations) {
		return (/** @type {any[]} */ ...args) => {
			const dom = fn(...args);

			var node = dom.nodeType === DOCUMENT_FRAGMENT_NODE ? dom.firstChild : dom;
			assign_locations(node, filename, locations);

			return dom;
		};
	}

	/**
	 * @param {Element} element
	 * @param {string} filename
	 * @param {SourceLocation} location
	 */
	function assign_location(element, filename, location) {
		// @ts-expect-error
		element.__svelte_meta = {
			parent: dev_stack,
			loc: { file: filename, line: location[0], column: location[1] }
		};

		if (location[2]) {
			assign_locations(element.firstChild, filename, location[2]);
		}
	}

	/**
	 * @param {Node | null} node
	 * @param {string} filename
	 * @param {SourceLocation[]} locations
	 */
	function assign_locations(node, filename, locations) {
		var i = 0;

		while (node && i < locations.length) {

			if (node.nodeType === ELEMENT_NODE) {
				assign_location(/** @type {Element} */ (node), filename, locations[i++]);
			}

			node = node.nextSibling;
		}
	}

	/**
	 * Used on elements, as a map of event type -> event handler,
	 * and on events themselves to track which element handled an event
	 */
	const event_symbol = Symbol('events');

	/** @type {Set<string>} */
	const all_registered_events = new Set();

	/** @type {Set<(events: Array<string>) => void>} */
	const root_event_handles = new Set();

	/**
	 * @param {string} event_name
	 * @param {EventTarget} dom
	 * @param {EventListener} [handler]
	 * @param {AddEventListenerOptions} [options]
	 */
	function create_event(event_name, dom, handler, options = {}) {
		/**
		 * @this {EventTarget}
		 */
		function target_handler(/** @type {Event} */ event) {
			if (!options.capture) {
				// Only call in the bubble phase, else delegated events would be called before the capturing events
				handle_event_propagation.call(dom, event);
			}
			if (!event.cancelBubble) {
				return without_reactive_context(() => {
					return handler?.call(this, event);
				});
			}
		}

		// Chrome has a bug where pointer events don't work when attached to a DOM element that has been cloned
		// with cloneNode() and the DOM element is disconnected from the document. To ensure the event works, we
		// defer the attachment till after it's been appended to the document. TODO: remove this once Chrome fixes
		// this bug. The same applies to wheel events and touch events.
		if (
			event_name.startsWith('pointer') ||
			event_name.startsWith('touch') ||
			event_name === 'wheel'
		) {
			queue_micro_task(() => {
				dom.addEventListener(event_name, target_handler, options);
			});
		} else {
			dom.addEventListener(event_name, target_handler, options);
		}

		return target_handler;
	}

	/**
	 * Attaches an event handler to an element and returns a function that removes the handler. Using this
	 * rather than `addEventListener` will preserve the correct order relative to handlers added declaratively
	 * (with attributes like `onclick`), which use event delegation for performance reasons
	 *
	 * @param {EventTarget} element
	 * @param {string} type
	 * @param {EventListener} handler
	 * @param {AddEventListenerOptions} [options]
	 */
	function on(element, type, handler, options = {}) {
		var target_handler = create_event(type, element, handler, options);

		return () => {
			element.removeEventListener(type, target_handler, options);
		};
	}

	/**
	 * @param {string} event_name
	 * @param {Element} dom
	 * @param {EventListener} [handler]
	 * @param {boolean} [capture]
	 * @param {boolean} [passive]
	 * @returns {void}
	 */
	function event(event_name, dom, handler, capture, passive) {
		var options = { capture, passive };
		var target_handler = create_event(event_name, dom, handler, options);

		if (
			dom === document.body ||
			// @ts-ignore
			dom === window ||
			// @ts-ignore
			dom === document ||
			// Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
			dom instanceof HTMLMediaElement
		) {
			teardown(() => {
				dom.removeEventListener(event_name, target_handler, options);
			});
		}
	}

	/**
	 * @param {string} event_name
	 * @param {Element} element
	 * @param {EventListener} [handler]
	 * @returns {void}
	 */
	function delegated(event_name, element, handler) {
		// @ts-expect-error
		(element[event_symbol] ??= {})[event_name] = handler;
	}

	/**
	 * @param {Array<string>} events
	 * @returns {void}
	 */
	function delegate(events) {
		for (var i = 0; i < events.length; i++) {
			all_registered_events.add(events[i]);
		}

		for (var fn of root_event_handles) {
			fn(events);
		}
	}

	// used to store the reference to the currently propagated event
	// to prevent garbage collection between microtasks in Firefox
	// If the event object is GCed too early, the expando __root property
	// set on the event object is lost, causing the event delegation
	// to process the event twice
	let last_propagated_event = null;

	/**
	 * @this {EventTarget}
	 * @param {Event} event
	 * @returns {void}
	 */
	function handle_event_propagation(event) {
		var handler_element = this;
		var owner_document = /** @type {Node} */ (handler_element).ownerDocument;
		var event_name = event.type;
		var path = event.composedPath?.() || [];
		var current_target = /** @type {null | Element} */ (path[0] || event.target);

		last_propagated_event = event;

		// composedPath contains list of nodes the event has propagated through.
		// We check `event_symbol` to skip all nodes below it in case this is a
		// parent of the `event_symbol` node, which indicates that there's nested
		// mounted apps. In this case we don't want to trigger events multiple times.
		var path_idx = 0;

		// the `last_propagated_event === event` check is redundant, but
		// without it the variable will be DCE'd and things will
		// fail mysteriously in Firefox
		// @ts-expect-error is added below
		var handled_at = last_propagated_event === event && event[event_symbol];

		if (handled_at) {
			var at_idx = path.indexOf(handled_at);
			if (
				at_idx !== -1 &&
				(handler_element === document || handler_element === /** @type {any} */ (window))
			) {
				// This is the fallback document listener or a window listener, but the event was already handled
				// -> ignore, but set handle_at to document/window so that we're resetting the event
				// chain in case someone manually dispatches the same event object again.
				// @ts-expect-error
				event[event_symbol] = handler_element;
				return;
			}

			// We're deliberately not skipping if the index is higher, because
			// someone could create an event programmatically and emit it multiple times,
			// in which case we want to handle the whole propagation chain properly each time.
			// (this will only be a false negative if the event is dispatched multiple times and
			// the fallback document listener isn't reached in between, but that's super rare)
			var handler_idx = path.indexOf(handler_element);
			if (handler_idx === -1) {
				// handle_idx can theoretically be -1 (happened in some JSDOM testing scenarios with an event listener on the window object)
				// so guard against that, too, and assume that everything was handled at this point.
				return;
			}

			if (at_idx <= handler_idx) {
				path_idx = at_idx;
			}
		}

		current_target = /** @type {Element} */ (path[path_idx] || event.target);
		// there can only be one delegated event per element, and we either already handled the current target,
		// or this is the very first target in the chain which has a non-delegated listener, in which case it's safe
		// to handle a possible delegated event on it later (through the root delegation listener for example).
		if (current_target === handler_element) return;

		// Proxy currentTarget to correct target
		define_property(event, 'currentTarget', {
			configurable: true,
			get() {
				return current_target || owner_document;
			}
		});

		// This started because of Chromium issue https://chromestatus.com/feature/5128696823545856,
		// where removal or moving of of the DOM can cause sync `blur` events to fire, which can cause logic
		// to run inside the current `active_reaction`, which isn't what we want at all. However, on reflection,
		// it's probably best that all event handled by Svelte have this behaviour, as we don't really want
		// an event handler to run in the context of another reaction or effect.
		var previous_reaction = active_reaction;
		var previous_effect = active_effect;
		set_active_reaction(null);
		set_active_effect(null);

		try {
			/**
			 * @type {unknown}
			 */
			var throw_error;
			/**
			 * @type {unknown[]}
			 */
			var other_errors = [];

			while (current_target !== null) {
				/** @type {null | Element} */
				var parent_element =
					current_target.assignedSlot ||
					current_target.parentNode ||
					/** @type {any} */ (current_target).host ||
					null;

				try {
					// @ts-expect-error
					var delegated = current_target[event_symbol]?.[event_name];

					if (
						delegated != null &&
						(!(/** @type {any} */ (current_target).disabled) ||
							// DOM could've been updated already by the time this is reached, so we check this as well
							// -> the target could not have been disabled because it emits the event in the first place
							event.target === current_target)
					) {
						delegated.call(current_target, event);
					}
				} catch (error) {
					if (throw_error) {
						other_errors.push(error);
					} else {
						throw_error = error;
					}
				}
				if (event.cancelBubble || parent_element === handler_element || parent_element === null) {
					break;
				}
				current_target = parent_element;
			}

			if (throw_error) {
				for (let error of other_errors) {
					// Throw the rest of the errors, one-by-one on a microtask
					queueMicrotask(() => {
						throw error;
					});
				}
				throw throw_error;
			}
		} finally {
			// @ts-expect-error is used above
			event[event_symbol] = handler_element;
			// @ts-ignore remove proxy on currentTarget
			delete event.currentTarget;
			set_active_reaction(previous_reaction);
			set_active_effect(previous_effect);
		}
	}

	const policy =
		// We gotta write it like this because after downleveling the pure comment may end up in the wrong location
		globalThis?.window?.trustedTypes &&
		/* @__PURE__ */ globalThis.window.trustedTypes.createPolicy('svelte-trusted-html', {
			/** @param {string} html */
			createHTML: (html) => {
				return html;
			}
		});

	/** @param {string} html */
	function create_trusted_html(html) {
		return /** @type {string} */ (policy?.createHTML(html) ?? html);
	}

	/**
	 * @param {string} html
	 */
	function create_fragment_from_html(html) {
		var elem = create_element('template');
		elem.innerHTML = create_trusted_html(html.replaceAll('<!>', '<!---->')); // XHTML compliance
		return elem.content;
	}

	/** @import { Effect, EffectNodes, TemplateNode } from '#client' */
	/** @import { TemplateStructure } from './types' */

	/**
	 * @param {TemplateNode} start
	 * @param {TemplateNode | null} end
	 */
	function assign_nodes(start, end) {
		var effect = /** @type {Effect} */ (active_effect);
		if (effect.nodes === null) {
			effect.nodes = { start, end, a: null, t: null };
		}
	}

	/**
	 * @param {string} content
	 * @param {number} flags
	 * @returns {() => Node | Node[]}
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function from_html(content, flags) {
		var is_fragment = (flags & TEMPLATE_FRAGMENT) !== 0;
		var use_import_node = (flags & TEMPLATE_USE_IMPORT_NODE) !== 0;

		/** @type {Node} */
		var node;

		/**
		 * Whether or not the first item is a text/element node. If not, we need to
		 * create an additional comment node to act as `effect.nodes.start`
		 */
		var has_start = !content.startsWith('<!>');

		return () => {

			if (node === undefined) {
				node = create_fragment_from_html(has_start ? content : '<!>' + content);
				if (!is_fragment) node = /** @type {TemplateNode} */ (get_first_child(node));
			}

			var clone = /** @type {TemplateNode} */ (
				use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
			);

			if (is_fragment) {
				var start = /** @type {TemplateNode} */ (get_first_child(clone));
				var end = /** @type {TemplateNode} */ (clone.lastChild);

				assign_nodes(start, end);
			} else {
				assign_nodes(clone, clone);
			}

			return clone;
		};
	}

	/**
	 * @param {string} content
	 * @param {number} flags
	 * @param {'svg' | 'math'} ns
	 * @returns {() => Node | Node[]}
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function from_namespace(content, flags, ns = 'svg') {
		/**
		 * Whether or not the first item is a text/element node. If not, we need to
		 * create an additional comment node to act as `effect.nodes.start`
		 */
		var has_start = !content.startsWith('<!>');

		var is_fragment = (flags & TEMPLATE_FRAGMENT) !== 0;
		var wrapped = `<${ns}>${has_start ? content : '<!>' + content}</${ns}>`;

		/** @type {Element | DocumentFragment} */
		var node;

		return () => {

			if (!node) {
				var fragment = /** @type {DocumentFragment} */ (create_fragment_from_html(wrapped));
				var root = /** @type {Element} */ (get_first_child(fragment));

				if (is_fragment) {
					node = document.createDocumentFragment();
					while (get_first_child(root)) {
						node.appendChild(/** @type {TemplateNode} */ (get_first_child(root)));
					}
				} else {
					node = /** @type {Element} */ (get_first_child(root));
				}
			}

			var clone = /** @type {TemplateNode} */ (node.cloneNode(true));

			if (is_fragment) {
				var start = /** @type {TemplateNode} */ (get_first_child(clone));
				var end = /** @type {TemplateNode} */ (clone.lastChild);

				assign_nodes(start, end);
			} else {
				assign_nodes(clone, clone);
			}

			return clone;
		};
	}

	/**
	 * @param {string} content
	 * @param {number} flags
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function from_svg(content, flags) {
		return from_namespace(content, flags, 'svg');
	}

	/**
	 * Don't mark this as side-effect-free, hydration needs to walk all nodes
	 * @param {any} value
	 */
	function text(value = '') {
		{
			var t = create_text(value + '');
			assign_nodes(t, t);
			return t;
		}
	}

	/**
	 * @returns {TemplateNode | DocumentFragment}
	 */
	function comment() {

		var frag = document.createDocumentFragment();
		var start = document.createComment('');
		var anchor = create_text();
		frag.append(start, anchor);

		assign_nodes(start, anchor);

		return frag;
	}

	/**
	 * Assign the created (or in hydration mode, traversed) dom elements to the current block
	 * and insert the elements into the dom (in client mode).
	 * @param {Text | Comment | Element} anchor
	 * @param {DocumentFragment | Element} dom
	 */
	function append(anchor, dom) {

		if (anchor === null) {
			// edge case — void `<svelte:element>` with content
			return;
		}

		anchor.before(/** @type {Node} */ (dom));
	}

	/** @import { ComponentContext, Effect, EffectNodes, TemplateNode } from '#client' */
	/** @import { Component, ComponentType, SvelteComponent, MountOptions } from '../../index.js' */

	/**
	 * This is normally true — block effects should run their intro transitions —
	 * but is false during hydration (unless `options.intro` is `true`) and
	 * when creating the children of a `<svelte:element>` that just changed tag
	 */
	let should_intro = true;

	/**
	 * @param {Element} text
	 * @param {string} value
	 * @returns {void}
	 */
	function set_text(text, value) {
		// For objects, we apply string coercion (which might make things like $state array references in the template reactive) before diffing
		var str = value == null ? '' : typeof value === 'object' ? `${value}` : value;
		// @ts-expect-error
		if (str !== (text.__t ??= text.nodeValue)) {
			// @ts-expect-error
			text.__t = str;
			text.nodeValue = `${str}`;
		}
	}

	/**
	 * Mounts a component to the given target and returns the exports and potentially the props (if compiled with `accessors: true`) of the component.
	 * Transitions will play during the initial render unless the `intro` option is set to `false`.
	 *
	 * @template {Record<string, any>} Props
	 * @template {Record<string, any>} Exports
	 * @param {ComponentType<SvelteComponent<Props>> | Component<Props, Exports, any>} component
	 * @param {MountOptions<Props>} options
	 * @returns {Exports}
	 */
	function mount(component, options) {
		return _mount(component, options);
	}

	/** @type {Map<EventTarget, Map<string, number>>} */
	const listeners = new Map();

	/**
	 * @template {Record<string, any>} Exports
	 * @param {ComponentType<SvelteComponent<any>> | Component<any>} Component
	 * @param {MountOptions} options
	 * @returns {Exports}
	 */
	function _mount(
		Component,
		{ target, anchor, props = {}, events, context, intro = true, transformError }
	) {
		init_operations();

		/** @type {Exports} */
		// @ts-expect-error will be defined because the render effect runs synchronously
		var component = undefined;

		var unmount = component_root(() => {
			var anchor_node = anchor ?? target.appendChild(create_text());

			boundary(
				/** @type {TemplateNode} */ (anchor_node),
				{
					pending: () => {}
				},
				(anchor_node) => {
					push({});
					var ctx = /** @type {ComponentContext} */ (component_context);
					if (context) ctx.c = context;

					if (events) {
						// We can't spread the object or else we'd lose the state proxy stuff, if it is one
						/** @type {any} */ (props).$$events = events;
					}

					should_intro = intro;
					// @ts-expect-error the public typings are not what the actual function looks like
					component = Component(anchor_node, props) || {};
					should_intro = true;

					pop();
				},
				transformError
			);

			// Setup event delegation _after_ component is mounted - if an error would happen during mount, it would otherwise not be cleaned up
			/** @type {Set<string>} */
			var registered_events = new Set();

			/** @param {Array<string>} events */
			var event_handle = (events) => {
				for (var i = 0; i < events.length; i++) {
					var event_name = events[i];

					if (registered_events.has(event_name)) continue;
					registered_events.add(event_name);

					var passive = is_passive_event(event_name);

					// Add the event listener to both the container and the document.
					// The container listener ensures we catch events from within in case
					// the outer content stops propagation of the event.
					//
					// The document listener ensures we catch events that originate from elements that were
					// manually moved outside of the container (e.g. via manual portals).
					for (const node of [target, document]) {
						var counts = listeners.get(node);

						if (counts === undefined) {
							counts = new Map();
							listeners.set(node, counts);
						}

						var count = counts.get(event_name);

						if (count === undefined) {
							node.addEventListener(event_name, handle_event_propagation, { passive });
							counts.set(event_name, 1);
						} else {
							counts.set(event_name, count + 1);
						}
					}
				}
			};

			event_handle(array_from(all_registered_events));
			root_event_handles.add(event_handle);

			return () => {
				for (var event_name of registered_events) {
					for (const node of [target, document]) {
						var counts = /** @type {Map<string, number>} */ (listeners.get(node));
						var count = /** @type {number} */ (counts.get(event_name));

						if (--count == 0) {
							node.removeEventListener(event_name, handle_event_propagation);
							counts.delete(event_name);

							if (counts.size === 0) {
								listeners.delete(node);
							}
						} else {
							counts.set(event_name, count);
						}
					}
				}

				root_event_handles.delete(event_handle);

				if (anchor_node !== anchor) {
					anchor_node.parentNode?.removeChild(anchor_node);
				}
			};
		});

		mounted_components.set(component, unmount);
		return component;
	}

	/**
	 * References of the components that were mounted or hydrated.
	 * Uses a `WeakMap` to avoid memory leaks.
	 */
	let mounted_components = new WeakMap();

	/** @param {Function & { [FILENAME]: string }} target */
	function check_target(target) {
		if (target) {
			component_api_invalid_new(target[FILENAME] ?? 'a component', target.name);
		}
	}

	function legacy_api() {
		const component = component_context?.function;

		/** @param {string} method */
		function error(method) {
			component_api_changed(method, component[FILENAME]);
		}

		return {
			$destroy: () => error('$destroy()'),
			$on: () => error('$on(...)'),
			$set: () => error('$set(...)')
		};
	}

	/**
	 * @param {Node} anchor
	 * @param {...(()=>any)[]} args
	 */
	function validate_snippet_args(anchor, ...args) {
		if (typeof anchor !== 'object' || !(anchor instanceof Node)) {
			invalid_snippet_arguments();
		}

		for (let arg of args) {
			if (typeof arg !== 'function') {
				invalid_snippet_arguments();
			}
		}
	}

	/** @import { Effect, TemplateNode } from '#client' */

	/**
	 * @typedef {{ effect: Effect, fragment: DocumentFragment }} Branch
	 */

	/**
	 * @template Key
	 */
	class BranchManager {
		/** @type {TemplateNode} */
		anchor;

		/** @type {Map<Batch, Key>} */
		#batches = new Map();

		/**
		 * Map of keys to effects that are currently rendered in the DOM.
		 * These effects are visible and actively part of the document tree.
		 * Example:
		 * ```
		 * {#if condition}
		 * 	foo
		 * {:else}
		 * 	bar
		 * {/if}
		 * ```
		 * Can result in the entries `true->Effect` and `false->Effect`
		 * @type {Map<Key, Effect>}
		 */
		#onscreen = new Map();

		/**
		 * Similar to #onscreen with respect to the keys, but contains branches that are not yet
		 * in the DOM, because their insertion is deferred.
		 * @type {Map<Key, Branch>}
		 */
		#offscreen = new Map();

		/**
		 * Keys of effects that are currently outroing
		 * @type {Set<Key>}
		 */
		#outroing = new Set();

		/**
		 * Whether to pause (i.e. outro) on change, or destroy immediately.
		 * This is necessary for `<svelte:element>`
		 */
		#transition = true;

		/**
		 * @param {TemplateNode} anchor
		 * @param {boolean} transition
		 */
		constructor(anchor, transition = true) {
			this.anchor = anchor;
			this.#transition = transition;
		}

		/**
		 * @param {Batch} batch
		 */
		#commit = (batch) => {
			// if this batch was made obsolete, bail
			if (!this.#batches.has(batch)) return;

			var key = /** @type {Key} */ (this.#batches.get(batch));

			var onscreen = this.#onscreen.get(key);

			if (onscreen) {
				// effect is already in the DOM — abort any current outro
				resume_effect(onscreen);
				this.#outroing.delete(key);
			} else {
				// effect is currently offscreen. put it in the DOM
				var offscreen = this.#offscreen.get(key);

				if (offscreen && (offscreen.effect.f & INERT) === 0) {
					this.#onscreen.set(key, offscreen.effect);
					this.#offscreen.delete(key);

					// remove the anchor...
					/** @type {TemplateNode} */ (offscreen.fragment.lastChild).remove();

					// ...and append the fragment
					this.anchor.before(offscreen.fragment);
					onscreen = offscreen.effect;
				}
			}

			for (const [b, k] of this.#batches) {
				this.#batches.delete(b);

				if (b === batch) {
					// keep values for newer batches
					break;
				}

				const offscreen = this.#offscreen.get(k);

				if (offscreen) {
					// for older batches, destroy offscreen effects
					// as they will never be committed
					destroy_effect(offscreen.effect);
					this.#offscreen.delete(k);
				}
			}

			// outro/destroy all onscreen effects...
			for (const [k, effect] of this.#onscreen) {
				// ...except the one that was just committed
				//    or those that are already outroing (else the transition is aborted and the effect destroyed right away)
				if (k === key || this.#outroing.has(k)) continue;

				// don't destroy branches that are inside outroing blocks
				if ((effect.f & INERT) !== 0) continue;

				const on_destroy = () => {
					const keys = Array.from(this.#batches.values());

					if (keys.includes(k)) {
						// keep the effect offscreen, as another batch will need it
						var fragment = document.createDocumentFragment();
						move_effect(effect, fragment);

						fragment.append(create_text()); // TODO can we avoid this?

						this.#offscreen.set(k, { effect, fragment });
					} else {
						destroy_effect(effect);
					}

					this.#outroing.delete(k);
					this.#onscreen.delete(k);
				};

				if (this.#transition || !onscreen) {
					this.#outroing.add(k);
					pause_effect(effect, on_destroy, false);
				} else {
					on_destroy();
				}
			}
		};

		/**
		 * @param {Batch} batch
		 */
		#discard = (batch) => {
			this.#batches.delete(batch);

			const keys = Array.from(this.#batches.values());

			for (const [k, branch] of this.#offscreen) {
				if (!keys.includes(k)) {
					destroy_effect(branch.effect);
					this.#offscreen.delete(k);
				}
			}
		};

		/**
		 *
		 * @param {any} key
		 * @param {null | ((target: TemplateNode) => void)} fn
		 */
		ensure(key, fn) {
			var batch = /** @type {Batch} */ (current_batch);
			var defer = should_defer_append();

			if (fn && !this.#onscreen.has(key) && !this.#offscreen.has(key)) {
				if (defer) {
					var fragment = document.createDocumentFragment();
					var target = create_text();

					fragment.append(target);

					this.#offscreen.set(key, {
						effect: branch(() => fn(target)),
						fragment
					});
				} else {
					this.#onscreen.set(
						key,
						branch(() => fn(this.anchor))
					);
				}
			}

			this.#batches.set(batch, key);

			if (defer) {
				for (const [k, effect] of this.#onscreen) {
					if (k === key) {
						batch.unskip_effect(effect);
					} else {
						batch.skip_effect(effect);
					}
				}

				for (const [k, branch] of this.#offscreen) {
					if (k === key) {
						batch.unskip_effect(branch.effect);
					} else {
						batch.skip_effect(branch.effect);
					}
				}

				batch.oncommit(this.#commit);
				batch.ondiscard(this.#discard);
			} else {

				this.#commit(batch);
			}
		}
	}

	/** @import { TemplateNode } from '#client' */

	/**
	 * @param {TemplateNode} node
	 * @param {(branch: (fn: (anchor: Node) => void, key?: number | false) => void) => void} fn
	 * @param {boolean} [elseif] True if this is an `{:else if ...}` block rather than an `{#if ...}`, as that affects which transitions are considered 'local'
	 * @returns {void}
	 */
	function if_block(node, fn, elseif = false) {

		var branches = new BranchManager(node);
		var flags = elseif ? EFFECT_TRANSPARENT : 0;

		/**
		 * @param {number | false} key
		 * @param {null | ((anchor: Node) => void)} fn
		 */
		function update_branch(key, fn) {

			branches.ensure(key, fn);
		}

		block(() => {
			var has_branch = false;

			fn((fn, key = 0) => {
				has_branch = true;
				update_branch(key, fn);
			});

			if (!has_branch) {
				update_branch(-1, null);
			}
		}, flags);
	}

	/** @import { TemplateNode } from '#client' */

	const NAN$1 = Symbol('NaN');

	/**
	 * @template V
	 * @param {TemplateNode} node
	 * @param {() => V} get_key
	 * @param {(anchor: Node) => TemplateNode | void} render_fn
	 * @returns {void}
	 */
	function key(node, get_key, render_fn) {

		var branches = new BranchManager(node);

		var legacy = !is_runes();

		block(() => {
			var key = get_key();

			// NaN !== NaN, hence we do this workaround to not trigger remounts unnecessarily
			if (key !== key) {
				key = /** @type {any} */ (NAN$1);
			}

			// key blocks in Svelte <5 had stupid semantics
			if (legacy && key !== null && typeof key === 'object') {
				key = /** @type {V} */ ({});
			}

			branches.ensure(key, render_fn);
		});
	}

	/** @import { EachItem, EachOutroGroup, EachState, Effect, EffectNodes, MaybeSource, Source, TemplateNode, TransitionManager, Value } from '#client' */
	/** @import { Batch } from '../../reactivity/batch.js'; */

	// When making substantive changes to this file, validate them with the each block stress test:
	// https://svelte.dev/playground/1972b2cf46564476ad8c8c6405b23b7b
	// This test also exists in this repo, as `packages/svelte/tests/manual/each-stress-test`

	/**
	 * @param {any} _
	 * @param {number} i
	 */
	function index(_, i) {
		return i;
	}

	/**
	 * Pause multiple effects simultaneously, and coordinate their
	 * subsequent destruction. Used in each blocks
	 * @param {EachState} state
	 * @param {Effect[]} to_destroy
	 * @param {null | Node} controlled_anchor
	 */
	function pause_effects(state, to_destroy, controlled_anchor) {
		/** @type {TransitionManager[]} */
		var transitions = [];
		var length = to_destroy.length;

		/** @type {EachOutroGroup} */
		var group;
		var remaining = to_destroy.length;

		for (var i = 0; i < length; i++) {
			let effect = to_destroy[i];

			pause_effect(
				effect,
				() => {
					if (group) {
						group.pending.delete(effect);
						group.done.add(effect);

						if (group.pending.size === 0) {
							var groups = /** @type {Set<EachOutroGroup>} */ (state.outrogroups);

							destroy_effects(state, array_from(group.done));
							groups.delete(group);

							if (groups.size === 0) {
								state.outrogroups = null;
							}
						}
					} else {
						remaining -= 1;
					}
				},
				false
			);
		}

		if (remaining === 0) {
			// If we're in a controlled each block (i.e. the block is the only child of an
			// element), and we are removing all items, _and_ there are no out transitions,
			// we can use the fast path — emptying the element and replacing the anchor
			var fast_path = transitions.length === 0 && controlled_anchor !== null;

			if (fast_path) {
				var anchor = /** @type {Element} */ (controlled_anchor);
				var parent_node = /** @type {Element} */ (anchor.parentNode);

				clear_text_content(parent_node);
				parent_node.append(anchor);

				state.items.clear();
			}

			destroy_effects(state, to_destroy, !fast_path);
		} else {
			group = {
				pending: new Set(to_destroy),
				done: new Set()
			};

			(state.outrogroups ??= new Set()).add(group);
		}
	}

	/**
	 * @param {EachState} state
	 * @param {Effect[]} to_destroy
	 * @param {boolean} remove_dom
	 */
	function destroy_effects(state, to_destroy, remove_dom = true) {
		/** @type {Set<Effect> | undefined} */
		var preserved_effects;

		// The loop-in-a-loop isn't ideal, but we should only hit this in relatively rare cases
		if (state.pending.size > 0) {
			preserved_effects = new Set();

			for (const keys of state.pending.values()) {
				for (const key of keys) {
					preserved_effects.add(/** @type {EachItem} */ (state.items.get(key)).e);
				}
			}
		}

		for (var i = 0; i < to_destroy.length; i++) {
			var e = to_destroy[i];

			if (preserved_effects?.has(e)) {
				e.f |= EFFECT_OFFSCREEN;

				const fragment = document.createDocumentFragment();
				move_effect(e, fragment);
			} else {
				destroy_effect(to_destroy[i], remove_dom);
			}
		}
	}

	/** @type {TemplateNode} */
	var offscreen_anchor;

	/**
	 * @template V
	 * @param {Element | Comment} node The next sibling node, or the parent node if this is a 'controlled' block
	 * @param {number} flags
	 * @param {() => V[]} get_collection
	 * @param {(value: V, index: number) => any} get_key
	 * @param {(anchor: Node, item: MaybeSource<V>, index: MaybeSource<number>) => void} render_fn
	 * @param {null | ((anchor: Node) => void)} fallback_fn
	 * @returns {void}
	 */
	function each(node, flags, get_collection, get_key, render_fn, fallback_fn = null) {
		var anchor = node;

		/** @type {Map<any, EachItem>} */
		var items = new Map();

		var is_controlled = (flags & EACH_IS_CONTROLLED) !== 0;

		if (is_controlled) {
			var parent_node = /** @type {Element} */ (node);

			anchor = parent_node.appendChild(create_text());
		}

		/** @type {Effect | null} */
		var fallback = null;

		// TODO: ideally we could use derived for runes mode but because of the ability
		// to use a store which can be mutated, we can't do that here as mutating a store
		// will still result in the collection array being the same from the store
		var each_array = derived_safe_equal(() => {
			var collection = get_collection();

			return is_array(collection) ? collection : collection == null ? [] : array_from(collection);
		});

		/** @type {V[]} */
		var array;

		/** @type {Map<Batch, Set<any>>} */
		var pending = new Map();

		var first_run = true;

		/**
		 * @param {Batch} batch
		 */
		function commit(batch) {
			if ((state.effect.f & DESTROYED) !== 0) {
				return;
			}

			state.pending.delete(batch);

			state.fallback = fallback;
			reconcile(state, array, anchor, flags, get_key);

			if (fallback !== null) {
				if (array.length === 0) {
					if ((fallback.f & EFFECT_OFFSCREEN) === 0) {
						resume_effect(fallback);
					} else {
						fallback.f ^= EFFECT_OFFSCREEN;
						move(fallback, null, anchor);
					}
				} else {
					pause_effect(fallback, () => {
						// TODO only null out if no pending batch needs it,
						// otherwise re-add `fallback.fragment` and move the
						// effect into it
						fallback = null;
					});
				}
			}
		}

		/**
		 * @param {Batch} batch
		 */
		function discard(batch) {
			state.pending.delete(batch);
		}

		var effect = block(() => {
			array = /** @type {V[]} */ (get$1(each_array));
			var length = array.length;

			var keys = new Set();
			var batch = /** @type {Batch} */ (current_batch);
			var defer = should_defer_append();

			for (var index = 0; index < length; index += 1) {

				var value = array[index];
				var key = get_key(value, index);

				var item = first_run ? null : items.get(key);

				if (item) {
					// update before reconciliation, to trigger any async updates
					if (item.v) internal_set(item.v, value);
					if (item.i) internal_set(item.i, index);

					if (defer) {
						batch.unskip_effect(item.e);
					}
				} else {
					item = create_item(
						items,
						first_run ? anchor : (offscreen_anchor ??= create_text()),
						value,
						key,
						index,
						render_fn,
						flags,
						get_collection
					);

					if (!first_run) {
						item.e.f |= EFFECT_OFFSCREEN;
					}

					items.set(key, item);
				}

				keys.add(key);
			}

			if (length === 0 && fallback_fn && !fallback) {
				if (first_run) {
					fallback = branch(() => fallback_fn(anchor));
				} else {
					fallback = branch(() => fallback_fn((offscreen_anchor ??= create_text())));
					fallback.f |= EFFECT_OFFSCREEN;
				}
			}

			if (length > keys.size) {
				{
					// in prod, the additional information isn't printed, so don't bother computing it
					each_key_duplicate();
				}
			}

			if (!first_run) {
				pending.set(batch, keys);

				if (defer) {
					for (const [key, item] of items) {
						if (!keys.has(key)) {
							batch.skip_effect(item.e);
						}
					}

					batch.oncommit(commit);
					batch.ondiscard(discard);
				} else {
					commit(batch);
				}
			}

			// When we mount the each block for the first time, the collection won't be
			// connected to this effect as the effect hasn't finished running yet and its deps
			// won't be assigned. However, it's possible that when reconciling the each block
			// that a mutation occurred and it's made the collection MAYBE_DIRTY, so reading the
			// collection again can provide consistency to the reactive graph again as the deriveds
			// will now be `CLEAN`.
			get$1(each_array);
		});

		/** @type {EachState} */
		var state = { effect, items, pending, outrogroups: null, fallback };

		first_run = false;
	}

	/**
	 * Skip past any non-branch effects (which could be created with `createSubscriber`, for example) to find the next branch effect
	 * @param {Effect | null} effect
	 * @returns {Effect | null}
	 */
	function skip_to_branch(effect) {
		while (effect !== null && (effect.f & BRANCH_EFFECT) === 0) {
			effect = effect.next;
		}
		return effect;
	}

	/**
	 * Add, remove, or reorder items output by an each block as its input changes
	 * @template V
	 * @param {EachState} state
	 * @param {Array<V>} array
	 * @param {Element | Comment | Text} anchor
	 * @param {number} flags
	 * @param {(value: V, index: number) => any} get_key
	 * @returns {void}
	 */
	function reconcile(state, array, anchor, flags, get_key) {
		var is_animated = (flags & EACH_IS_ANIMATED) !== 0;

		var length = array.length;
		var items = state.items;
		var current = skip_to_branch(state.effect.first);

		/** @type {undefined | Set<Effect>} */
		var seen;

		/** @type {Effect | null} */
		var prev = null;

		/** @type {undefined | Set<Effect>} */
		var to_animate;

		/** @type {Effect[]} */
		var matched = [];

		/** @type {Effect[]} */
		var stashed = [];

		/** @type {V} */
		var value;

		/** @type {any} */
		var key;

		/** @type {Effect | undefined} */
		var effect;

		/** @type {number} */
		var i;

		if (is_animated) {
			for (i = 0; i < length; i += 1) {
				value = array[i];
				key = get_key(value, i);
				effect = /** @type {EachItem} */ (items.get(key)).e;

				// offscreen == coming in now, no animation in that case,
				// else this would happen https://github.com/sveltejs/svelte/issues/17181
				if ((effect.f & EFFECT_OFFSCREEN) === 0) {
					effect.nodes?.a?.measure();
					(to_animate ??= new Set()).add(effect);
				}
			}
		}

		for (i = 0; i < length; i += 1) {
			value = array[i];
			key = get_key(value, i);

			effect = /** @type {EachItem} */ (items.get(key)).e;

			if (state.outrogroups !== null) {
				for (const group of state.outrogroups) {
					group.pending.delete(effect);
					group.done.delete(effect);
				}
			}

			if ((effect.f & EFFECT_OFFSCREEN) !== 0) {
				effect.f ^= EFFECT_OFFSCREEN;

				if (effect === current) {
					move(effect, null, anchor);
				} else {
					var next = prev ? prev.next : current;

					if (effect === state.effect.last) {
						state.effect.last = effect.prev;
					}

					if (effect.prev) effect.prev.next = effect.next;
					if (effect.next) effect.next.prev = effect.prev;
					link(state, prev, effect);
					link(state, effect, next);

					move(effect, next, anchor);
					prev = effect;

					matched = [];
					stashed = [];

					current = skip_to_branch(prev.next);
					continue;
				}
			}

			if ((effect.f & INERT) !== 0) {
				resume_effect(effect);
				if (is_animated) {
					effect.nodes?.a?.unfix();
					(to_animate ??= new Set()).delete(effect);
				}
			}

			if (effect !== current) {
				if (seen !== undefined && seen.has(effect)) {
					if (matched.length < stashed.length) {
						// more efficient to move later items to the front
						var start = stashed[0];
						var j;

						prev = start.prev;

						var a = matched[0];
						var b = matched[matched.length - 1];

						for (j = 0; j < matched.length; j += 1) {
							move(matched[j], start, anchor);
						}

						for (j = 0; j < stashed.length; j += 1) {
							seen.delete(stashed[j]);
						}

						link(state, a.prev, b.next);
						link(state, prev, a);
						link(state, b, start);

						current = start;
						prev = b;
						i -= 1;

						matched = [];
						stashed = [];
					} else {
						// more efficient to move earlier items to the back
						seen.delete(effect);
						move(effect, current, anchor);

						link(state, effect.prev, effect.next);
						link(state, effect, prev === null ? state.effect.first : prev.next);
						link(state, prev, effect);

						prev = effect;
					}

					continue;
				}

				matched = [];
				stashed = [];

				while (current !== null && current !== effect) {
					(seen ??= new Set()).add(current);
					stashed.push(current);
					current = skip_to_branch(current.next);
				}

				if (current === null) {
					continue;
				}
			}

			if ((effect.f & EFFECT_OFFSCREEN) === 0) {
				matched.push(effect);
			}

			prev = effect;
			current = skip_to_branch(effect.next);
		}

		if (state.outrogroups !== null) {
			for (const group of state.outrogroups) {
				if (group.pending.size === 0) {
					destroy_effects(state, array_from(group.done));
					state.outrogroups?.delete(group);
				}
			}

			if (state.outrogroups.size === 0) {
				state.outrogroups = null;
			}
		}

		if (current !== null || seen !== undefined) {
			/** @type {Effect[]} */
			var to_destroy = [];

			if (seen !== undefined) {
				for (effect of seen) {
					if ((effect.f & INERT) === 0) {
						to_destroy.push(effect);
					}
				}
			}

			while (current !== null) {
				// If the each block isn't inert, then inert effects are currently outroing and will be removed once the transition is finished
				if ((current.f & INERT) === 0 && current !== state.fallback) {
					to_destroy.push(current);
				}

				current = skip_to_branch(current.next);
			}

			var destroy_length = to_destroy.length;

			if (destroy_length > 0) {
				var controlled_anchor = (flags & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;

				if (is_animated) {
					for (i = 0; i < destroy_length; i += 1) {
						to_destroy[i].nodes?.a?.measure();
					}

					for (i = 0; i < destroy_length; i += 1) {
						to_destroy[i].nodes?.a?.fix();
					}
				}

				pause_effects(state, to_destroy, controlled_anchor);
			}
		}

		if (is_animated) {
			queue_micro_task(() => {
				if (to_animate === undefined) return;
				for (effect of to_animate) {
					effect.nodes?.a?.apply();
				}
			});
		}
	}

	/**
	 * @template V
	 * @param {Map<any, EachItem>} items
	 * @param {Node} anchor
	 * @param {V} value
	 * @param {unknown} key
	 * @param {number} index
	 * @param {(anchor: Node, item: V | Source<V>, index: number | Value<number>, collection: () => V[]) => void} render_fn
	 * @param {number} flags
	 * @param {() => V[]} get_collection
	 * @returns {EachItem}
	 */
	function create_item(items, anchor, value, key, index, render_fn, flags, get_collection) {
		var v =
			(flags & EACH_ITEM_REACTIVE) !== 0
				? (flags & EACH_ITEM_IMMUTABLE) === 0
					? mutable_source(value, false, false)
					: source(value)
				: null;

		var i = (flags & EACH_INDEX_REACTIVE) !== 0 ? source(index) : null;

		return {
			v,
			i,
			e: branch(() => {
				render_fn(anchor, v ?? value, i ?? index, get_collection);

				return () => {
					items.delete(key);
				};
			})
		};
	}

	/**
	 * @param {Effect} effect
	 * @param {Effect | null} next
	 * @param {Text | Element | Comment} anchor
	 */
	function move(effect, next, anchor) {
		if (!effect.nodes) return;

		var node = effect.nodes.start;
		var end = effect.nodes.end;

		var dest =
			next && (next.f & EFFECT_OFFSCREEN) === 0
				? /** @type {EffectNodes} */ (next.nodes).start
				: anchor;

		while (node !== null) {
			var next_node = /** @type {TemplateNode} */ (get_next_sibling(node));
			dest.before(node);

			if (node === end) {
				return;
			}

			node = next_node;
		}
	}

	/**
	 * @param {EachState} state
	 * @param {Effect | null} prev
	 * @param {Effect | null} next
	 */
	function link(state, prev, next) {
		if (prev === null) {
			state.effect.first = next;
		} else {
			prev.next = next;
		}

		if (next === null) {
			state.effect.last = prev;
		} else {
			next.prev = prev;
		}
	}

	/**
	 * @param {Comment} anchor
	 * @param {Record<string, any>} $$props
	 * @param {string} name
	 * @param {Record<string, unknown>} slot_props
	 * @param {null | ((anchor: Comment) => void)} fallback_fn
	 */
	function slot(anchor, $$props, name, slot_props, fallback_fn) {

		var slot_fn = $$props.$$slots?.[name];
		// Interop: Can use snippets to fill slots
		var is_interop = false;
		if (slot_fn === true) {
			slot_fn = $$props['children' ];
			is_interop = true;
		}

		if (slot_fn === undefined) ; else {
			slot_fn(anchor, is_interop ? () => slot_props : slot_props);
		}
	}

	/**
	 * @param {any} store
	 * @param {string} name
	 */
	function validate_store(store, name) {
		if (store != null && typeof store.subscribe !== 'function') {
			store_invalid_shape();
		}
	}

	/**
	 * @template {(...args: any[]) => unknown} T
	 * @param {T} fn
	 */
	function prevent_snippet_stringification(fn) {
		fn.toString = () => {
			snippet_without_render_tag();
			return '';
		};
		return fn;
	}

	/** @import { Snippet } from 'svelte' */
	/** @import { TemplateNode } from '#client' */
	/** @import { Getters } from '#shared' */

	/**
	 * @template {(node: TemplateNode, ...args: any[]) => void} SnippetFn
	 * @param {TemplateNode} node
	 * @param {() => SnippetFn | null | undefined} get_snippet
	 * @param {(() => any)[]} args
	 * @returns {void}
	 */
	function snippet(node, get_snippet, ...args) {
		var branches = new BranchManager(node);

		block(() => {
			const snippet = get_snippet() ?? null;

			branches.ensure(snippet, snippet && ((anchor) => snippet(anchor, ...args)));
		}, EFFECT_TRANSPARENT);
	}

	/**
	 * In development, wrap the snippet function so that it passes validation, and so that the
	 * correct component context is set for ownership checks
	 * @param {any} component
	 * @param {(node: TemplateNode, ...args: any[]) => void} fn
	 */
	function wrap_snippet(component, fn) {
		const snippet = (/** @type {TemplateNode} */ node, /** @type {any[]} */ ...args) => {

			try {
				return fn(node, ...args);
			} finally {
			}
		};

		prevent_snippet_stringification(snippet);

		return snippet;
	}

	/** @import { TemplateNode, Dom } from '#client' */

	/**
	 * @template P
	 * @template {(props: P) => void} C
	 * @param {TemplateNode} node
	 * @param {() => C} get_component
	 * @param {(anchor: TemplateNode, component: C) => Dom | void} render_fn
	 * @returns {void}
	 */
	function component(node, get_component, render_fn) {

		var branches = new BranchManager(node);

		block(() => {
			var component = get_component() ?? null;

			branches.ensure(component, component && ((target) => render_fn(target, component)));
		}, EFFECT_TRANSPARENT);
	}

	/** @import { Raf } from '#client' */

	const now$1 = () => performance.now() ;

	/** @type {Raf} */
	const raf = {
		// don't access requestAnimationFrame eagerly outside method
		// this allows basic testing of user code without JSDOM
		// bunder will eval and remove ternary when the user's app is built
		tick: /** @param {any} _ */ (_) => (requestAnimationFrame )(_),
		now: () => now$1(),
		tasks: new Set()
	};

	/** @import { TaskCallback, Task, TaskEntry } from '#client' */

	// TODO move this into timing.js where it probably belongs

	/**
	 * @returns {void}
	 */
	function run_tasks() {
		// use `raf.now()` instead of the `requestAnimationFrame` callback argument, because
		// otherwise things can get wonky https://github.com/sveltejs/svelte/pull/14541
		const now = raf.now();

		raf.tasks.forEach((task) => {
			if (!task.c(now)) {
				raf.tasks.delete(task);
				task.f();
			}
		});

		if (raf.tasks.size !== 0) {
			raf.tick(run_tasks);
		}
	}

	/**
	 * Creates a new task that runs on each raf frame
	 * until it returns a falsy value or is aborted
	 * @param {TaskCallback} callback
	 * @returns {Task}
	 */
	function loop(callback) {
		/** @type {TaskEntry} */
		let task;

		if (raf.tasks.size === 0) {
			raf.tick(run_tasks);
		}

		return {
			promise: new Promise((fulfill) => {
				raf.tasks.add((task = { c: callback, f: fulfill }));
			}),
			abort() {
				raf.tasks.delete(task);
			}
		};
	}

	/** @import { AnimateFn, Animation, AnimationConfig, EachItem, Effect, EffectNodes, TransitionFn, TransitionManager } from '#client' */

	/**
	 * @param {Element} element
	 * @param {'introstart' | 'introend' | 'outrostart' | 'outroend'} type
	 * @returns {void}
	 */
	function dispatch_event(element, type) {
		without_reactive_context(() => {
			element.dispatchEvent(new CustomEvent(type));
		});
	}

	/**
	 * Converts a property to the camel-case format expected by Element.animate(), KeyframeEffect(), and KeyframeEffect.setKeyframes().
	 * @param {string} style
	 * @returns {string}
	 */
	function css_property_to_camelcase(style) {
		// in compliance with spec
		if (style === 'float') return 'cssFloat';
		if (style === 'offset') return 'cssOffset';

		// do not rename custom @properties
		if (style.startsWith('--')) return style;

		const parts = style.split('-');
		if (parts.length === 1) return parts[0];
		return (
			parts[0] +
			parts
				.slice(1)
				.map(/** @param {any} word */ (word) => word[0].toUpperCase() + word.slice(1))
				.join('')
		);
	}

	/**
	 * @param {string} css
	 * @returns {Keyframe}
	 */
	function css_to_keyframe(css) {
		/** @type {Keyframe} */
		const keyframe = {};
		const parts = css.split(';');
		for (const part of parts) {
			const [property, value] = part.split(':');
			if (!property || value === undefined) break;

			const formatted_property = css_property_to_camelcase(property.trim());
			keyframe[formatted_property] = value.trim();
		}
		return keyframe;
	}

	/** @param {number} t */
	const linear = (t) => t;

	/**
	 * Called inside block effects as `$.transition(...)`. This creates a transition manager and
	 * attaches it to the current effect — later, inside `pause_effect` and `resume_effect`, we
	 * use this to create `intro` and `outro` transitions.
	 * @template P
	 * @param {number} flags
	 * @param {HTMLElement} element
	 * @param {() => TransitionFn<P | undefined>} get_fn
	 * @param {(() => P) | null} get_params
	 * @returns {void}
	 */
	function transition(flags, element, get_fn, get_params) {
		var is_global = (flags & TRANSITION_GLOBAL) !== 0;

		/** @type {'in' | 'out' | 'both'} */
		var direction = 'both' ;

		/** @type {AnimationConfig | ((opts: { direction: 'in' | 'out' }) => AnimationConfig) | undefined} */
		var current_options;

		var inert = element.inert;

		/**
		 * The default overflow style, stashed so we can revert changes during the transition
		 * that are necessary to work around a Safari <18 bug
		 * TODO 6.0 remove this, if older versions of Safari have died out enough
		 */
		var overflow = element.style.overflow;

		/** @type {Animation | undefined} */
		var intro;

		/** @type {Animation | undefined} */
		var outro;

		function get_options() {
			return without_reactive_context(() => {
				// If a transition is still ongoing, we use the existing options rather than generating
				// new ones. This ensures that reversible transitions reverse smoothly, rather than
				// jumping to a new spot because (for example) a different `duration` was used
				return (current_options ??= get_fn()(element, get_params?.() ?? /** @type {P} */ ({}), {
					direction
				}));
			});
		}

		/** @type {TransitionManager} */
		var transition = {
			is_global,
			in() {
				element.inert = inert;

				intro = animate(element, get_options(), outro, 1, () => {
					dispatch_event(element, 'introend');

					// Ensure we cancel the animation to prevent leaking
					intro?.abort();
					intro = current_options = undefined;

					element.style.overflow = overflow;
				});
			},
			out(fn) {

				element.inert = true;

				outro = animate(element, get_options(), intro, 0, () => {
					dispatch_event(element, 'outroend');
					fn?.();
				});
			},
			stop: () => {
				intro?.abort();
				outro?.abort();
			}
		};

		var e = /** @type {Effect & { nodes: EffectNodes }} */ (active_effect);

		(e.nodes.t ??= []).push(transition);

		// if this is a local transition, we only want to run it if the parent (branch) effect's
		// parent (block) effect is where the state change happened. we can determine that by
		// looking at whether the block effect is currently initializing
		if (should_intro) {
			var run = is_global;

			if (!run) {
				var block = /** @type {Effect | null} */ (e.parent);

				// skip over transparent blocks (e.g. snippets, else-if blocks)
				while (block && (block.f & EFFECT_TRANSPARENT) !== 0) {
					while ((block = block.parent)) {
						if ((block.f & BLOCK_EFFECT) !== 0) break;
					}
				}

				run = !block || (block.f & REACTION_RAN) !== 0;
			}

			if (run) {
				effect(() => {
					untrack(() => transition.in());
				});
			}
		}
	}

	/**
	 * Animates an element, according to the provided configuration
	 * @param {Element} element
	 * @param {AnimationConfig | ((opts: { direction: 'in' | 'out' }) => AnimationConfig)} options
	 * @param {Animation | undefined} counterpart The corresponding intro/outro to this outro/intro
	 * @param {number} t2 The target `t` value — `1` for intro, `0` for outro
	 * @param {(() => void)} on_finish Called after successfully completing the animation
	 * @returns {Animation}
	 */
	function animate(element, options, counterpart, t2, on_finish) {
		var is_intro = t2 === 1;

		if (is_function(options)) {
			// In the case of a deferred transition (such as `crossfade`), `option` will be
			// a function rather than an `AnimationConfig`. We need to call this function
			// once the DOM has been updated...
			/** @type {Animation} */
			var a;
			var aborted = false;

			queue_micro_task(() => {
				if (aborted) return;
				var o = options({ direction: is_intro ? 'in' : 'out' });
				a = animate(element, o, counterpart, t2, on_finish);
			});

			// ...but we want to do so without using `async`/`await` everywhere, so
			// we return a facade that allows everything to remain synchronous
			return {
				abort: () => {
					aborted = true;
					a?.abort();
				},
				deactivate: () => a.deactivate(),
				reset: () => a.reset(),
				t: () => a.t()
			};
		}

		counterpart?.deactivate();

		if (!options?.duration && !options?.delay) {
			dispatch_event(element, is_intro ? 'introstart' : 'outrostart');
			on_finish();

			return {
				abort: noop$1,
				deactivate: noop$1,
				reset: noop$1,
				t: () => t2
			};
		}

		const { delay = 0, css, tick, easing = linear } = options;

		var keyframes = [];

		if (is_intro && counterpart === undefined) {
			if (tick) {
				tick(0, 1); // TODO put in nested effect, to avoid interleaved reads/writes?
			}

			if (css) {
				var styles = css_to_keyframe(css(0, 1));
				keyframes.push(styles, styles);
			}
		}

		var get_t = () => 1 - t2;

		// create a dummy animation that lasts as long as the delay (but with whatever devtools
		// multiplier is in effect). in the common case that it is `0`, we keep it anyway so that
		// the CSS keyframes aren't created until the DOM is updated
		//
		// fill forwards to prevent the element from rendering without styles applied
		// see https://github.com/sveltejs/svelte/issues/14732
		var animation = element.animate(keyframes, { duration: delay, fill: 'forwards' });

		animation.onfinish = () => {
			// remove dummy animation from the stack to prevent conflict with main animation
			animation.cancel();

			dispatch_event(element, is_intro ? 'introstart' : 'outrostart');

			// for bidirectional transitions, we start from the current position,
			// rather than doing a full intro/outro
			var t1 = counterpart?.t() ?? 1 - t2;
			counterpart?.abort();

			var delta = t2 - t1;
			var duration = /** @type {number} */ (options.duration) * Math.abs(delta);
			var keyframes = [];

			if (duration > 0) {
				/**
				 * Whether or not the CSS includes `overflow: hidden`, in which case we need to
				 * add it as an inline style to work around a Safari <18 bug
				 * TODO 6.0 remove this, if possible
				 */
				var needs_overflow_hidden = false;

				if (css) {
					var n = Math.ceil(duration / (1000 / 60)); // `n` must be an integer, or we risk missing the `t2` value

					for (var i = 0; i <= n; i += 1) {
						var t = t1 + delta * easing(i / n);
						var styles = css_to_keyframe(css(t, 1 - t));
						keyframes.push(styles);

						needs_overflow_hidden ||= styles.overflow === 'hidden';
					}
				}

				if (needs_overflow_hidden) {
					/** @type {HTMLElement} */ (element).style.overflow = 'hidden';
				}

				get_t = () => {
					var time = /** @type {number} */ (
						/** @type {globalThis.Animation} */ (animation).currentTime
					);

					return t1 + delta * easing(time / duration);
				};

				if (tick) {
					loop(() => {
						if (animation.playState !== 'running') return false;

						var t = get_t();
						tick(t, 1 - t);

						return true;
					});
				}
			}

			animation = element.animate(keyframes, { duration, fill: 'forwards' });

			animation.onfinish = () => {
				get_t = () => t2;
				tick?.(t2, 1 - t2);
				on_finish();
			};
		};

		return {
			abort: () => {
				if (animation) {
					animation.cancel();
					// This prevents memory leaks in Chromium
					animation.effect = null;
					// This prevents onfinish to be launched after cancel(),
					// which can happen in some rare cases
					// see https://github.com/sveltejs/svelte/issues/13681
					animation.onfinish = noop$1;
				}
			},
			deactivate: () => {
				on_finish = noop$1;
			},
			reset: () => {
				if (t2 === 0) {
					tick?.(1, 0);
				}
			},
			t: () => get_t()
		};
	}

	/** @import { Effect } from '#client' */

	// TODO in 6.0 or 7.0, when we remove legacy mode, we can simplify this by
	// getting rid of the block/branch stuff and just letting the effect rip.
	// see https://github.com/sveltejs/svelte/pull/15962

	/**
	 * @param {Element} node
	 * @param {() => (node: Element) => void} get_fn
	 */
	function attach(node, get_fn) {
		/** @type {false | undefined | ((node: Element) => void)} */
		var fn = undefined;

		/** @type {Effect | null} */
		var e;

		managed(() => {
			if (fn !== (fn = get_fn())) {
				if (e) {
					destroy_effect(e);
					e = null;
				}

				if (fn) {
					e = branch(() => {
						effect(() => /** @type {(node: Element) => void} */ (fn)(node));
					});
				}
			}
		});
	}

	function r(e){var t,f,n="";if("string"==typeof e||"number"==typeof e)n+=e;else if("object"==typeof e)if(Array.isArray(e)){var o=e.length;for(t=0;t<o;t++)e[t]&&(f=r(e[t]))&&(n&&(n+=" "),n+=f);}else for(f in e)e[f]&&(n&&(n+=" "),n+=f);return n}function clsx$1(){for(var e,t,f=0,n="",o=arguments.length;f<o;f++)(e=arguments[f])&&(t=r(e))&&(n&&(n+=" "),n+=t);return n}

	/**
	 * Small wrapper around clsx to preserve Svelte's (weird) handling of falsy values.
	 * TODO Svelte 6 revisit this, and likely turn all falsy values into the empty string (what clsx also does)
	 * @param  {any} value
	 */
	function clsx(value) {
		if (typeof value === 'object') {
			return clsx$1(value);
		} else {
			return value ?? '';
		}
	}

	const whitespace = [...' \t\n\r\f\u00a0\u000b\ufeff'];

	/**
	 * @param {any} value
	 * @param {string | null} [hash]
	 * @param {Record<string, boolean>} [directives]
	 * @returns {string | null}
	 */
	function to_class(value, hash, directives) {
		var classname = value == null ? '' : '' + value;

		if (hash) {
			classname = classname ? classname + ' ' + hash : hash;
		}

		if (directives) {
			for (var key of Object.keys(directives)) {
				if (directives[key]) {
					classname = classname ? classname + ' ' + key : key;
				} else if (classname.length) {
					var len = key.length;
					var a = 0;

					while ((a = classname.indexOf(key, a)) >= 0) {
						var b = a + len;

						if (
							(a === 0 || whitespace.includes(classname[a - 1])) &&
							(b === classname.length || whitespace.includes(classname[b]))
						) {
							classname = (a === 0 ? '' : classname.substring(0, a)) + classname.substring(b + 1);
						} else {
							a = b;
						}
					}
				}
			}
		}

		return classname === '' ? null : classname;
	}

	/**
	 *
	 * @param {Record<string,any>} styles
	 * @param {boolean} important
	 */
	function append_styles(styles, important = false) {
		var separator = important ? ' !important;' : ';';
		var css = '';

		for (var key of Object.keys(styles)) {
			var value = styles[key];
			if (value != null && value !== '') {
				css += ' ' + key + ': ' + value + separator;
			}
		}

		return css;
	}

	/**
	 * @param {string} name
	 * @returns {string}
	 */
	function to_css_name(name) {
		if (name[0] !== '-' || name[1] !== '-') {
			return name.toLowerCase();
		}
		return name;
	}

	/**
	 * @param {any} value
	 * @param {Record<string, any> | [Record<string, any>, Record<string, any>]} [styles]
	 * @returns {string | null}
	 */
	function to_style(value, styles) {
		if (styles) {
			var new_style = '';

			/** @type {Record<string,any> | undefined} */
			var normal_styles;

			/** @type {Record<string,any> | undefined} */
			var important_styles;

			if (Array.isArray(styles)) {
				normal_styles = styles[0];
				important_styles = styles[1];
			} else {
				normal_styles = styles;
			}

			if (value) {
				value = String(value)
					.replaceAll(/\s*\/\*.*?\*\/\s*/g, '')
					.trim();

				/** @type {boolean | '"' | "'"} */
				var in_str = false;
				var in_apo = 0;
				var in_comment = false;

				var reserved_names = [];

				if (normal_styles) {
					reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
				}
				if (important_styles) {
					reserved_names.push(...Object.keys(important_styles).map(to_css_name));
				}

				var start_index = 0;
				var name_index = -1;

				const len = value.length;
				for (var i = 0; i < len; i++) {
					var c = value[i];

					if (in_comment) {
						if (c === '/' && value[i - 1] === '*') {
							in_comment = false;
						}
					} else if (in_str) {
						if (in_str === c) {
							in_str = false;
						}
					} else if (c === '/' && value[i + 1] === '*') {
						in_comment = true;
					} else if (c === '"' || c === "'") {
						in_str = c;
					} else if (c === '(') {
						in_apo++;
					} else if (c === ')') {
						in_apo--;
					}

					if (!in_comment && in_str === false && in_apo === 0) {
						if (c === ':' && name_index === -1) {
							name_index = i;
						} else if (c === ';' || i === len - 1) {
							if (name_index !== -1) {
								var name = to_css_name(value.substring(start_index, name_index).trim());

								if (!reserved_names.includes(name)) {
									if (c !== ';') {
										i++;
									}

									var property = value.substring(start_index, i).trim();
									new_style += ' ' + property + ';';
								}
							}

							start_index = i + 1;
							name_index = -1;
						}
					}
				}
			}

			if (normal_styles) {
				new_style += append_styles(normal_styles);
			}

			if (important_styles) {
				new_style += append_styles(important_styles, true);
			}

			new_style = new_style.trim();
			return new_style === '' ? null : new_style;
		}

		return value == null ? null : String(value);
	}

	/**
	 * @param {Element} dom
	 * @param {boolean | number} is_html
	 * @param {string | null} value
	 * @param {string} [hash]
	 * @param {Record<string, any>} [prev_classes]
	 * @param {Record<string, any>} [next_classes]
	 * @returns {Record<string, boolean> | undefined}
	 */
	function set_class(dom, is_html, value, hash, prev_classes, next_classes) {
		// @ts-expect-error need to add __className to patched prototype
		var prev = dom.__className;

		if (
			prev !== value ||
			prev === undefined // for edge case of `class={undefined}`
		) {
			var next_class_name = to_class(value, hash, next_classes);

			{
				// Removing the attribute when the value is only an empty string causes
				// performance issues vs simply making the className an empty string. So
				// we should only remove the class if the value is nullish
				// and there no hash/directives :
				if (next_class_name == null) {
					dom.removeAttribute('class');
				} else if (is_html) {
					dom.className = next_class_name;
				} else {
					dom.setAttribute('class', next_class_name);
				}
			}

			// @ts-expect-error need to add __className to patched prototype
			dom.__className = value;
		} else if (next_classes && prev_classes !== next_classes) {
			for (var key in next_classes) {
				var is_present = !!next_classes[key];

				if (prev_classes == null || is_present !== !!prev_classes[key]) {
					dom.classList.toggle(key, is_present);
				}
			}
		}

		return next_classes;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} dom
	 * @param {Record<string, any>} prev
	 * @param {Record<string, any>} next
	 * @param {string} [priority]
	 */
	function update_styles(dom, prev = {}, next, priority) {
		for (var key in next) {
			var value = next[key];

			if (prev[key] !== value) {
				if (next[key] == null) {
					dom.style.removeProperty(key);
				} else {
					dom.style.setProperty(key, value, priority);
				}
			}
		}
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} dom
	 * @param {string | null} value
	 * @param {Record<string, any> | [Record<string, any>, Record<string, any>]} [prev_styles]
	 * @param {Record<string, any> | [Record<string, any>, Record<string, any>]} [next_styles]
	 */
	function set_style(dom, value, prev_styles, next_styles) {
		// @ts-expect-error
		var prev = dom.__style;

		if (prev !== value) {
			var next_style_attr = to_style(value, next_styles);

			{
				if (next_style_attr == null) {
					dom.removeAttribute('style');
				} else {
					dom.style.cssText = next_style_attr;
				}
			}

			// @ts-expect-error
			dom.__style = value;
		} else if (next_styles) {
			if (Array.isArray(next_styles)) {
				update_styles(dom, prev_styles?.[0], next_styles[0]);
				update_styles(dom, prev_styles?.[1], next_styles[1], 'important');
			} else {
				update_styles(dom, prev_styles, next_styles);
			}
		}

		return next_styles;
	}

	/**
	 * Selects the correct option(s) (depending on whether this is a multiple select)
	 * @template V
	 * @param {HTMLSelectElement} select
	 * @param {V} value
	 * @param {boolean} mounting
	 */
	function select_option(select, value, mounting = false) {
		if (select.multiple) {
			// If value is null or undefined, keep the selection as is
			if (value == undefined) {
				return;
			}

			// If not an array, warn and keep the selection as is
			if (!is_array(value)) {
				return select_multiple_invalid_value();
			}

			// Otherwise, update the selection
			for (var option of select.options) {
				option.selected = value.includes(get_option_value(option));
			}

			return;
		}

		for (option of select.options) {
			var option_value = get_option_value(option);
			if (is(option_value, value)) {
				option.selected = true;
				return;
			}
		}

		if (!mounting || value !== undefined) {
			select.selectedIndex = -1; // no option should be selected
		}
	}

	/**
	 * Selects the correct option(s) if `value` is given,
	 * and then sets up a mutation observer to sync the
	 * current selection to the dom when it changes. Such
	 * changes could for example occur when options are
	 * inside an `#each` block.
	 * @param {HTMLSelectElement} select
	 */
	function init_select(select) {
		var observer = new MutationObserver(() => {
			// @ts-ignore
			select_option(select, select.__value);
			// Deliberately don't update the potential binding value,
			// the model should be preserved unless explicitly changed
		});

		observer.observe(select, {
			// Listen to option element changes
			childList: true,
			subtree: true, // because of <optgroup>
			// Listen to option element value attribute changes
			// (doesn't get notified of select value changes,
			// because that property is not reflected as an attribute)
			attributes: true,
			attributeFilter: ['value']
		});

		teardown(() => {
			observer.disconnect();
		});
	}

	/** @param {HTMLOptionElement} option */
	function get_option_value(option) {
		// __value only exists if the <option> has a value attribute
		if ('__value' in option) {
			return option.__value;
		} else {
			return option.value;
		}
	}

	/** @import { Blocker, Effect } from '#client' */

	const CLASS = Symbol('class');
	const STYLE = Symbol('style');

	const IS_CUSTOM_ELEMENT = Symbol('is custom element');
	const IS_HTML = Symbol('is html');
	const OPTION_TAG = IS_XHTML ? 'option' : 'OPTION';
	const SELECT_TAG = IS_XHTML ? 'select' : 'SELECT';

	/**
	 * Sets the `selected` attribute on an `option` element.
	 * Not set through the property because that doesn't reflect to the DOM,
	 * which means it wouldn't be taken into account when a form is reset.
	 * @param {HTMLOptionElement} element
	 * @param {boolean} selected
	 */
	function set_selected(element, selected) {
		if (selected) {
			// The selected option could've changed via user selection, and
			// setting the value without this check would set it back.
			if (!element.hasAttribute('selected')) {
				element.setAttribute('selected', '');
			}
		} else {
			element.removeAttribute('selected');
		}
	}

	/**
	 * @param {Element} element
	 * @param {string} attribute
	 * @param {string | null} value
	 * @param {boolean} [skip_warning]
	 */
	function set_attribute(element, attribute, value, skip_warning) {
		var attributes = get_attributes(element);

		if (attributes[attribute] === (attributes[attribute] = value)) return;

		if (attribute === 'loading') {
			// @ts-expect-error
			element[LOADING_ATTR_SYMBOL] = value;
		}

		if (value == null) {
			element.removeAttribute(attribute);
		} else if (typeof value !== 'string' && get_setters(element).includes(attribute)) {
			// @ts-ignore
			element[attribute] = value;
		} else {
			element.setAttribute(attribute, value);
		}
	}

	/**
	 * Spreads attributes onto a DOM element, taking into account the currently set attributes
	 * @param {Element & ElementCSSInlineStyle} element
	 * @param {Record<string | symbol, any> | undefined} prev
	 * @param {Record<string | symbol, any>} next New attributes - this function mutates this object
	 * @param {string} [css_hash]
	 * @param {boolean} [should_remove_defaults]
	 * @param {boolean} [skip_warning]
	 * @returns {Record<string, any>}
	 */
	function set_attributes(
		element,
		prev,
		next,
		css_hash,
		should_remove_defaults = false,
		skip_warning = false
	) {

		var attributes = get_attributes(element);

		var is_custom_element = attributes[IS_CUSTOM_ELEMENT];
		var preserve_attribute_case = !attributes[IS_HTML];

		var current = prev || {};
		var is_option_element = element.nodeName === OPTION_TAG;

		for (var key in prev) {
			if (!(key in next)) {
				next[key] = null;
			}
		}

		if (next.class) {
			next.class = clsx(next.class);
		} else {
			next.class = null; /* force call to set_class() */
		}

		if (next[STYLE]) {
			next.style ??= null; /* force call to set_style() */
		}

		var setters = get_setters(element);

		// since key is captured we use const
		for (const key in next) {
			// let instead of var because referenced in a closure
			let value = next[key];

			// Up here because we want to do this for the initial value, too, even if it's undefined,
			// and this wouldn't be reached in case of undefined because of the equality check below
			if (is_option_element && key === 'value' && value == null) {
				// The <option> element is a special case because removing the value attribute means
				// the value is set to the text content of the option element, and setting the value
				// to null or undefined means the value is set to the string "null" or "undefined".
				// To align with how we handle this case in non-spread-scenarios, this logic is needed.
				// There's a super-edge-case bug here that is left in in favor of smaller code size:
				// Because of the "set missing props to null" logic above, we can't differentiate
				// between a missing value and an explicitly set value of null or undefined. That means
				// that once set, the value attribute of an <option> element can't be removed. This is
				// a very rare edge case, and removing the attribute altogether isn't possible either
				// for the <option value={undefined}> case, so we're not losing any functionality here.
				// @ts-ignore
				element.value = element.__value = '';
				current[key] = value;
				continue;
			}

			if (key === 'class') {
				var is_html = element.namespaceURI === 'http://www.w3.org/1999/xhtml';
				set_class(element, is_html, value, css_hash, prev?.[CLASS], next[CLASS]);
				current[key] = value;
				current[CLASS] = next[CLASS];
				continue;
			}

			if (key === 'style') {
				set_style(element, value, prev?.[STYLE], next[STYLE]);
				current[key] = value;
				current[STYLE] = next[STYLE];
				continue;
			}

			var prev_value = current[key];

			// Skip if value is unchanged, unless it's `undefined` and the element still has the attribute
			if (value === prev_value && !(value === undefined && element.hasAttribute(key))) {
				continue;
			}

			current[key] = value;

			var prefix = key[0] + key[1]; // this is faster than key.slice(0, 2)
			if (prefix === '$$') continue;

			if (prefix === 'on') {
				/** @type {{ capture?: true }} */
				const opts = {};
				const event_handle_key = '$$' + key;
				let event_name = key.slice(2);
				var is_delegated = can_delegate_event(event_name);

				if (is_capture_event(event_name)) {
					event_name = event_name.slice(0, -7);
					opts.capture = true;
				}

				if (!is_delegated && prev_value) {
					// Listening to same event but different handler -> our handle function below takes care of this
					// If we were to remove and add listeners in this case, it could happen that the event is "swallowed"
					// (the browser seems to not know yet that a new one exists now) and doesn't reach the handler
					// https://github.com/sveltejs/svelte/issues/11903
					if (value != null) continue;

					element.removeEventListener(event_name, current[event_handle_key], opts);
					current[event_handle_key] = null;
				}

				if (is_delegated) {
					delegated(event_name, element, value);
					delegate([event_name]);
				} else if (value != null) {
					/**
					 * @this {any}
					 * @param {Event} evt
					 */
					function handle(evt) {
						current[key].call(this, evt);
					}

					current[event_handle_key] = create_event(event_name, element, handle, opts);
				}
			} else if (key === 'style') {
				// avoid using the setter
				set_attribute(element, key, value);
			} else if (key === 'autofocus') {
				autofocus(/** @type {HTMLElement} */ (element), Boolean(value));
			} else if (!is_custom_element && (key === '__value' || (key === 'value' && value != null))) {
				// @ts-ignore We're not running this for custom elements because __value is actually
				// how Lit stores the current value on the element, and messing with that would break things.
				element.value = element.__value = value;
			} else if (key === 'selected' && is_option_element) {
				set_selected(/** @type {HTMLOptionElement} */ (element), value);
			} else {
				var name = key;
				if (!preserve_attribute_case) {
					name = normalize_attribute(name);
				}

				var is_default = name === 'defaultValue' || name === 'defaultChecked';

				if (value == null && !is_custom_element && !is_default) {
					attributes[key] = null;

					if (name === 'value' || name === 'checked') {
						// removing value/checked also removes defaultValue/defaultChecked — preserve
						let input = /** @type {HTMLInputElement} */ (element);
						const use_default = prev === undefined;
						if (name === 'value') {
							let previous = input.defaultValue;
							input.removeAttribute(name);
							input.defaultValue = previous;
							// @ts-ignore
							input.value = input.__value = use_default ? previous : null;
						} else {
							let previous = input.defaultChecked;
							input.removeAttribute(name);
							input.defaultChecked = previous;
							input.checked = use_default ? previous : false;
						}
					} else {
						element.removeAttribute(key);
					}
				} else if (
					is_default ||
					(setters.includes(name) && (is_custom_element || typeof value !== 'string'))
				) {
					// @ts-ignore
					element[name] = value;
					// remove it from attributes's cache
					if (name in attributes) attributes[name] = UNINITIALIZED;
				} else if (typeof value !== 'function') {
					set_attribute(element, name, value);
				}
			}
		}

		return current;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} element
	 * @param {(...expressions: any) => Record<string | symbol, any>} fn
	 * @param {Array<() => any>} sync
	 * @param {Array<() => Promise<any>>} async
	 * @param {Blocker[]} blockers
	 * @param {string} [css_hash]
	 * @param {boolean} [should_remove_defaults]
	 * @param {boolean} [skip_warning]
	 */
	function attribute_effect(
		element,
		fn,
		sync = [],
		async = [],
		blockers = [],
		css_hash,
		should_remove_defaults = false,
		skip_warning = false
	) {
		flatten(blockers, sync, async, (values) => {
			/** @type {Record<string | symbol, any> | undefined} */
			var prev = undefined;

			/** @type {Record<symbol, Effect>} */
			var effects = {};

			var is_select = element.nodeName === SELECT_TAG;
			var inited = false;

			managed(() => {
				var next = fn(...values.map(get$1));
				/** @type {Record<string | symbol, any>} */
				var current = set_attributes(
					element,
					prev,
					next,
					css_hash,
					should_remove_defaults,
					skip_warning
				);

				if (inited && is_select && 'value' in next) {
					select_option(/** @type {HTMLSelectElement} */ (element), next.value);
				}

				for (let symbol of Object.getOwnPropertySymbols(effects)) {
					if (!next[symbol]) destroy_effect(effects[symbol]);
				}

				for (let symbol of Object.getOwnPropertySymbols(next)) {
					var n = next[symbol];

					if (symbol.description === ATTACHMENT_KEY && (!prev || n !== prev[symbol])) {
						if (effects[symbol]) destroy_effect(effects[symbol]);
						effects[symbol] = branch(() => attach(element, () => n));
					}

					current[symbol] = n;
				}

				prev = current;
			});

			if (is_select) {
				var select = /** @type {HTMLSelectElement} */ (element);

				effect(() => {
					select_option(select, /** @type {Record<string | symbol, any>} */ (prev).value, true);
					init_select(select);
				});
			}

			inited = true;
		});
	}

	/**
	 *
	 * @param {Element} element
	 */
	function get_attributes(element) {
		return /** @type {Record<string | symbol, unknown>} **/ (
			// @ts-expect-error
			element.__attributes ??= {
				[IS_CUSTOM_ELEMENT]: element.nodeName.includes('-'),
				[IS_HTML]: element.namespaceURI === NAMESPACE_HTML
			}
		);
	}

	/** @type {Map<string, string[]>} */
	var setters_cache = new Map();

	/** @param {Element} element */
	function get_setters(element) {
		var cache_key = element.getAttribute('is') || element.nodeName;
		var setters = setters_cache.get(cache_key);
		if (setters) return setters;
		setters_cache.set(cache_key, (setters = []));

		var descriptors;
		var proto = element; // In the case of custom elements there might be setters on the instance
		var element_proto = Element.prototype;

		// Stop at Element, from there on there's only unnecessary setters we're not interested in
		// Do not use contructor.name here as that's unreliable in some browser environments
		while (element_proto !== proto) {
			descriptors = get_descriptors(proto);

			for (var key in descriptors) {
				if (descriptors[key].set) {
					setters.push(key);
				}
			}

			proto = get_prototype_of(proto);
		}

		return setters;
	}

	/**
	 * @param {any} bound_value
	 * @param {Element} element_or_component
	 * @returns {boolean}
	 */
	function is_bound_this(bound_value, element_or_component) {
		return (
			bound_value === element_or_component || bound_value?.[STATE_SYMBOL] === element_or_component
		);
	}

	/**
	 * @param {any} element_or_component
	 * @param {(value: unknown, ...parts: unknown[]) => void} update
	 * @param {(...parts: unknown[]) => unknown} get_value
	 * @param {() => unknown[]} [get_parts] Set if the this binding is used inside an each block,
	 * 										returns all the parts of the each block context that are used in the expression
	 * @returns {void}
	 */
	function bind_this(element_or_component = {}, update, get_value, get_parts) {
		effect(() => {
			/** @type {unknown[]} */
			var old_parts;

			/** @type {unknown[]} */
			var parts;

			render_effect(() => {
				old_parts = parts;
				// We only track changes to the parts, not the value itself to avoid unnecessary reruns.
				parts = [];

				untrack(() => {
					if (element_or_component !== get_value(...parts)) {
						update(element_or_component, ...parts);
						// If this is an effect rerun (cause: each block context changes), then nullify the binding at
						// the previous position if it isn't already taken over by a different effect.
						if (old_parts && is_bound_this(get_value(...old_parts), element_or_component)) {
							update(null, ...old_parts);
						}
					}
				});
			});

			return () => {
				// We cannot use effects in the teardown phase, we we use a microtask instead.
				queue_micro_task(() => {
					if (parts && is_bound_this(get_value(...parts), element_or_component)) {
						update(null, ...parts);
					}
				});
			};
		});

		return element_or_component;
	}

	/** @import { ComponentContextLegacy } from '#client' */

	/**
	 * Legacy-mode only: Call `onMount` callbacks and set up `beforeUpdate`/`afterUpdate` effects
	 * @param {boolean} [immutable]
	 */
	function init(immutable = false) {
		const context = /** @type {ComponentContextLegacy} */ (component_context);

		const callbacks = context.l.u;
		if (!callbacks) return;

		let props = () => deep_read_state(context.s);

		if (immutable) {
			let version = 0;
			let prev = /** @type {Record<string, any>} */ ({});

			// In legacy immutable mode, before/afterUpdate only fire if the object identity of a prop changes
			const d = derived(() => {
				let changed = false;
				const props = context.s;
				for (const key in props) {
					if (props[key] !== prev[key]) {
						prev[key] = props[key];
						changed = true;
					}
				}
				if (changed) version++;
				return version;
			});

			props = () => get$1(d);
		}

		// beforeUpdate
		if (callbacks.b.length) {
			user_pre_effect(() => {
				observe_all(context, props);
				run_all(callbacks.b);
			});
		}

		// onMount (must run before afterUpdate)
		user_effect(() => {
			const fns = untrack(() => callbacks.m.map(run));
			return () => {
				for (const fn of fns) {
					if (typeof fn === 'function') {
						fn();
					}
				}
			};
		});

		// afterUpdate
		if (callbacks.a.length) {
			user_effect(() => {
				observe_all(context, props);
				run_all(callbacks.a);
			});
		}
	}

	/**
	 * Invoke the getter of all signals associated with a component
	 * so they can be registered to the effect this function is called in.
	 * @param {ComponentContextLegacy} context
	 * @param {(() => void)} props
	 */
	function observe_all(context, props) {
		if (context.l.s) {
			for (const signal of context.l.s) get$1(signal);
		}

		props();
	}

	/** @import { Readable } from './public' */

	/**
	 * @template T
	 * @param {Readable<T> | null | undefined} store
	 * @param {(value: T) => void} run
	 * @param {(value: T) => void} [invalidate]
	 * @returns {() => void}
	 */
	function subscribe_to_store(store, run, invalidate) {
		if (store == null) {
			// @ts-expect-error
			run(undefined);

			return noop$1;
		}

		// Svelte store takes a private second argument
		// StartStopNotifier could mutate state, and we want to silence the corresponding validation error
		const unsub = untrack(() =>
			store.subscribe(
				run,
				// @ts-expect-error
				invalidate
			)
		);

		// Also support RxJS
		// @ts-expect-error TODO fix this in the types?
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/** @import { Readable, StartStopNotifier, Subscriber, Unsubscriber, Updater, Writable } from '../public.js' */
	/** @import { Stores, StoresValues, SubscribeInvalidateTuple } from '../private.js' */

	/**
	 * @type {Array<SubscribeInvalidateTuple<any> | any>}
	 */
	const subscriber_queue = [];

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * @template T
	 * @param {T} [value] initial value
	 * @param {StartStopNotifier<T>} [start]
	 * @returns {Writable<T>}
	 */
	function writable(value, start = noop$1) {
		/** @type {Unsubscriber | null} */
		let stop = null;

		/** @type {Set<SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();

		/**
		 * @param {T} new_value
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
		 * @param {Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(/** @type {T} */ (value)));
		}

		/**
		 * @param {Subscriber<T>} run
		 * @param {() => void} [invalidate]
		 * @returns {Unsubscriber}
		 */
		function subscribe(run, invalidate = noop$1) {
			/** @type {SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop$1;
			}
			run(/** @type {T} */ (value));
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

	/**
	 * Get the current value from a store by subscribing and immediately unsubscribing.
	 *
	 * @template T
	 * @param {Readable<T>} store
	 * @returns {T}
	 */
	function get(store) {
		let value;
		subscribe_to_store(store, (_) => (value = _))();
		// @ts-expect-error
		return value;
	}

	/** @import { StoreReferencesContainer } from '#client' */
	/** @import { Store } from '#shared' */

	/**
	 * Whether or not the prop currently being read is a store binding, as in
	 * `<Child bind:x={$y} />`. If it is, we treat the prop as mutable even in
	 * runes mode, and skip `binding_property_non_reactive` validation
	 */
	let is_store_binding = false;

	let IS_UNMOUNTED = Symbol();

	/**
	 * Gets the current value of a store. If the store isn't subscribed to yet, it will create a proxy
	 * signal that will be updated when the store is. The store references container is needed to
	 * track reassignments to stores and to track the correct component context.
	 * @template V
	 * @param {Store<V> | null | undefined} store
	 * @param {string} store_name
	 * @param {StoreReferencesContainer} stores
	 * @returns {V}
	 */
	function store_get(store, store_name, stores) {
		const entry = (stores[store_name] ??= {
			store: null,
			source: mutable_source(undefined),
			unsubscribe: noop$1
		});

		// if the component that setup this is already unmounted we don't want to register a subscription
		if (entry.store !== store && !(IS_UNMOUNTED in stores)) {
			entry.unsubscribe();
			entry.store = store ?? null;

			if (store == null) {
				entry.source.v = undefined; // see synchronous callback comment below
				entry.unsubscribe = noop$1;
			} else {
				var is_synchronous_callback = true;

				entry.unsubscribe = subscribe_to_store(store, (v) => {
					if (is_synchronous_callback) {
						// If the first updates to the store value (possibly multiple of them) are synchronously
						// inside a derived, we will hit the `state_unsafe_mutation` error if we `set` the value
						entry.source.v = v;
					} else {
						set(entry.source, v);
					}
				});

				is_synchronous_callback = false;
			}
		}

		// if the component that setup this stores is already unmounted the source will be out of sync
		// so we just use the `get` for the stores, less performant but it avoids to create a memory leak
		// and it will keep the value consistent
		if (store && IS_UNMOUNTED in stores) {
			return get(store);
		}

		return get$1(entry.source);
	}

	/**
	 * Unsubscribes from all auto-subscribed stores on destroy
	 * @returns {[StoreReferencesContainer, ()=>void]}
	 */
	function setup_stores() {
		/** @type {StoreReferencesContainer} */
		const stores = {};

		function cleanup() {
			teardown(() => {
				for (var store_name in stores) {
					const ref = stores[store_name];
					ref.unsubscribe();
				}
				define_property(stores, IS_UNMOUNTED, {
					enumerable: false,
					value: true
				});
			});
		}

		return [stores, cleanup];
	}

	/**
	 * Returns a tuple that indicates whether `fn()` reads a prop that is a store binding.
	 * Used to prevent `binding_property_non_reactive` validation false positives and
	 * ensure that these props are treated as mutable even in runes mode
	 * @template T
	 * @param {() => T} fn
	 * @returns {[T, boolean]}
	 */
	function capture_store_binding(fn) {
		var previous_is_store_binding = is_store_binding;

		try {
			is_store_binding = false;
			return [fn(), is_store_binding];
		} finally {
			is_store_binding = previous_is_store_binding;
		}
	}

	/** @import { Effect, Source } from './types.js' */

	/**
	 * The proxy handler for rest props (i.e. `const { x, ...rest } = $props()`).
	 * Is passed the full `$$props` object and excludes the named props.
	 * @type {ProxyHandler<{ props: Record<string | symbol, unknown>, exclude: Array<string | symbol>, name?: string }>}}
	 */
	const rest_props_handler = {
		get(target, key) {
			if (target.exclude.includes(key)) return;
			return target.props[key];
		},
		set(target, key) {

			return false;
		},
		getOwnPropertyDescriptor(target, key) {
			if (target.exclude.includes(key)) return;
			if (key in target.props) {
				return {
					enumerable: true,
					configurable: true,
					value: target.props[key]
				};
			}
		},
		has(target, key) {
			if (target.exclude.includes(key)) return false;
			return key in target.props;
		},
		ownKeys(target) {
			return Reflect.ownKeys(target.props).filter((key) => !target.exclude.includes(key));
		}
	};

	/**
	 * @param {Record<string, unknown>} props
	 * @param {string[]} exclude
	 * @param {string} [name]
	 * @returns {Record<string, unknown>}
	 */
	/*#__NO_SIDE_EFFECTS__*/
	function rest_props(props, exclude, name) {
		return new Proxy(
			{ props, exclude },
			rest_props_handler
		);
	}

	/**
	 * The proxy handler for spread props. Handles the incoming array of props
	 * that looks like `() => { dynamic: props }, { static: prop }, ..` and wraps
	 * them so that the whole thing is passed to the component as the `$$props` argument.
	 * @type {ProxyHandler<{ props: Array<Record<string | symbol, unknown> | (() => Record<string | symbol, unknown>)> }>}}
	 */
	const spread_props_handler = {
		get(target, key) {
			let i = target.props.length;
			while (i--) {
				let p = target.props[i];
				if (is_function(p)) p = p();
				if (typeof p === 'object' && p !== null && key in p) return p[key];
			}
		},
		set(target, key, value) {
			let i = target.props.length;
			while (i--) {
				let p = target.props[i];
				if (is_function(p)) p = p();
				const desc = get_descriptor(p, key);
				if (desc && desc.set) {
					desc.set(value);
					return true;
				}
			}
			return false;
		},
		getOwnPropertyDescriptor(target, key) {
			let i = target.props.length;
			while (i--) {
				let p = target.props[i];
				if (is_function(p)) p = p();
				if (typeof p === 'object' && p !== null && key in p) {
					const descriptor = get_descriptor(p, key);
					if (descriptor && !descriptor.configurable) {
						// Prevent a "Non-configurability Report Error": The target is an array, it does
						// not actually contain this property. If it is now described as non-configurable,
						// the proxy throws a validation error. Setting it to true avoids that.
						descriptor.configurable = true;
					}
					return descriptor;
				}
			}
		},
		has(target, key) {
			// To prevent a false positive `is_entry_props` in the `prop` function
			if (key === STATE_SYMBOL || key === LEGACY_PROPS) return false;

			for (let p of target.props) {
				if (is_function(p)) p = p();
				if (p != null && key in p) return true;
			}

			return false;
		},
		ownKeys(target) {
			/** @type {Array<string | symbol>} */
			const keys = [];

			for (let p of target.props) {
				if (is_function(p)) p = p();
				if (!p) continue;

				for (const key in p) {
					if (!keys.includes(key)) keys.push(key);
				}

				for (const key of Object.getOwnPropertySymbols(p)) {
					if (!keys.includes(key)) keys.push(key);
				}
			}

			return keys;
		}
	};

	/**
	 * @param {Array<Record<string, unknown> | (() => Record<string, unknown>)>} props
	 * @returns {any}
	 */
	function spread_props(...props) {
		return new Proxy({ props }, spread_props_handler);
	}

	/**
	 * This function is responsible for synchronizing a possibly bound prop with the inner component state.
	 * It is used whenever the compiler sees that the component writes to the prop, or when it has a default prop_value.
	 * @template V
	 * @param {Record<string, unknown>} props
	 * @param {string} key
	 * @param {number} flags
	 * @param {V | (() => V)} [fallback]
	 * @returns {(() => V | ((arg: V) => V) | ((arg: V, mutation: boolean) => V))}
	 */
	function prop(props, key, flags, fallback) {
		var runes = !legacy_mode_flag || (flags & PROPS_IS_RUNES) !== 0;
		var bindable = (flags & PROPS_IS_BINDABLE) !== 0;
		var lazy = (flags & PROPS_IS_LAZY_INITIAL) !== 0;

		var fallback_value = /** @type {V} */ (fallback);
		var fallback_dirty = true;

		var get_fallback = () => {
			if (fallback_dirty) {
				fallback_dirty = false;

				fallback_value = lazy
					? untrack(/** @type {() => V} */ (fallback))
					: /** @type {V} */ (fallback);
			}

			return fallback_value;
		};

		/** @type {((v: V) => void) | undefined} */
		var setter;

		if (bindable) {
			// Can be the case when someone does `mount(Component, props)` with `let props = $state({...})`
			// or `createClassComponent(Component, props)`
			var is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props;

			setter =
				get_descriptor(props, key)?.set ??
				(is_entry_props && key in props ? (v) => (props[key] = v) : undefined);
		}

		var initial_value;
		var is_store_sub = false;

		if (bindable) {
			[initial_value, is_store_sub] = capture_store_binding(() => /** @type {V} */ (props[key]));
		} else {
			initial_value = /** @type {V} */ (props[key]);
		}

		if (initial_value === undefined && fallback !== undefined) {
			initial_value = get_fallback();

			if (setter) {
				if (runes) props_invalid_value();
				setter(initial_value);
			}
		}

		/** @type {() => V} */
		var getter;

		if (runes) {
			getter = () => {
				var value = /** @type {V} */ (props[key]);
				if (value === undefined) return get_fallback();
				fallback_dirty = true;
				return value;
			};
		} else {
			getter = () => {
				var value = /** @type {V} */ (props[key]);

				if (value !== undefined) {
					// in legacy mode, we don't revert to the fallback value
					// if the prop goes from defined to undefined. The easiest
					// way to model this is to make the fallback undefined
					// as soon as the prop has a value
					fallback_value = /** @type {V} */ (undefined);
				}

				return value === undefined ? fallback_value : value;
			};
		}

		// prop is never written to — we only need a getter
		if (runes && (flags & PROPS_IS_UPDATED) === 0) {
			return getter;
		}

		// prop is written to, but the parent component had `bind:foo` which
		// means we can just call `$$props.foo = value` directly
		if (setter) {
			var legacy_parent = props.$$legacy;
			return /** @type {() => V} */ (
				function (/** @type {V} */ value, /** @type {boolean} */ mutation) {
					if (arguments.length > 0) {
						// We don't want to notify if the value was mutated and the parent is in runes mode.
						// In that case the state proxy (if it exists) should take care of the notification.
						// If the parent is not in runes mode, we need to notify on mutation, too, that the prop
						// has changed because the parent will not be able to detect the change otherwise.
						if (!runes || !mutation || legacy_parent || is_store_sub) {
							/** @type {Function} */ (setter)(mutation ? getter() : value);
						}

						return value;
					}

					return getter();
				}
			);
		}

		// Either prop is written to, but there's no binding, which means we
		// create a derived that we can write to locally.
		// Or we are in legacy mode where we always create a derived to replicate that
		// Svelte 4 did not trigger updates when a primitive value was updated to the same value.
		var overridden = false;

		var d = ((flags & PROPS_IS_IMMUTABLE) !== 0 ? derived : derived_safe_equal)(() => {
			overridden = false;
			return getter();
		});

		// Capture the initial value if it's bindable
		if (bindable) get$1(d);

		var parent_effect = /** @type {Effect} */ (active_effect);

		return /** @type {() => V} */ (
			function (/** @type {any} */ value, /** @type {boolean} */ mutation) {
				if (arguments.length > 0) {
					const new_value = mutation ? get$1(d) : runes && bindable ? proxy(value) : value;

					set(d, new_value);
					overridden = true;

					if (fallback_value !== undefined) {
						fallback_value = new_value;
					}

					return value;
				}

				// special case — avoid recalculating the derived if we're in a
				// teardown function and the prop was overridden locally, or the
				// component was already destroyed (this latter part is necessary
				// because `bind:this` can read props after the component has
				// been destroyed. TODO simplify `bind:this`
				if ((is_destroying_effect && overridden) || (parent_effect.f & DESTROYED) !== 0) {
					return d.v;
				}

				return get$1(d);
			}
		);
	}

	/**
	 * @param {string} method
	 * @param  {...any} objects
	 */
	function log_if_contains_state(method, ...objects) {
		untrack(() => {
			try {
				let has_state = false;
				const transformed = [];

				for (const obj of objects) {
					if (obj && typeof obj === 'object' && STATE_SYMBOL in obj) {
						transformed.push(snapshot(obj, true));
						has_state = true;
					} else {
						transformed.push(obj);
					}
				}

				if (has_state) {
					console_log_state(method);

					// eslint-disable-next-line no-console
					console.log('%c[snapshot]', 'color: grey', ...transformed);
				}
			} catch {
				// Errors can occur when trying to snapshot objects with getters that throw or non-enumerable properties.
			}
		});

		return objects;
	}

	/** @import { ComponentContext, ComponentContextLegacy } from '#client' */
	/** @import { EventDispatcher } from './index.js' */
	/** @import { NotFunction } from './internal/types.js' */

	/**
	 * `onMount`, like [`$effect`](https://svelte.dev/docs/svelte/$effect), schedules a function to run as soon as the component has been mounted to the DOM.
	 * Unlike `$effect`, the provided function only runs once.
	 *
	 * It must be called during the component's initialisation (but doesn't need to live _inside_ the component;
	 * it can be called from an external module). If a function is returned _synchronously_ from `onMount`,
	 * it will be called when the component is unmounted.
	 *
	 * `onMount` functions do not run during [server-side rendering](https://svelte.dev/docs/svelte/svelte-server#render).
	 *
	 * @template T
	 * @param {() => NotFunction<T> | Promise<NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		if (component_context === null) {
			lifecycle_outside_component();
		}

		if (legacy_mode_flag && component_context.l !== null) {
			init_update_callbacks(component_context).m.push(fn);
		} else {
			user_effect(() => {
				const cleanup = untrack(fn);
				if (typeof cleanup === 'function') return /** @type {() => void} */ (cleanup);
			});
		}
	}

	/**
	 * Legacy-mode: Init callbacks object for onMount/beforeUpdate/afterUpdate
	 * @param {ComponentContext} context
	 */
	function init_update_callbacks(context) {
		var l = /** @type {ComponentContextLegacy} */ (context).l;
		return (l.u ??= { a: [], b: [], m: [] });
	}

	// generated during release, do not modify

	const PUBLIC_VERSION = '5';

	if (typeof window !== 'undefined') {
		// @ts-expect-error
		((window.__svelte ??= {}).v ??= new Set()).add(PUBLIC_VERSION);
	}

	enable_legacy_mode_flag();

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

	/** Detect free variable `self`. */
	var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root$i = freeGlobal || freeSelf || Function('return this')();

	/** Built-in value references. */
	var Symbol$1 = root$i.Symbol;

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
	var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;

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
	var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;

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
	  return root$i.Date.now();
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
	function throttle$1(func, wait, options) {
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
	 * simplebar-core - v1.2.6
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
	var canUseDOM$1 = !!(typeof window !== 'undefined' &&
	    window.document &&
	    window.document.createElement);

	var helpers = /*#__PURE__*/Object.freeze({
	    __proto__: null,
	    addClasses: addClasses$1,
	    canUseDOM: canUseDOM$1,
	    classNamesToQuery: classNamesToQuery$1,
	    getElementDocument: getElementDocument$1,
	    getElementWindow: getElementWindow$1,
	    getOptions: getOptions$1,
	    removeClasses: removeClasses$1
	});

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
	        this.isDragging = false;
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
	            dragPos =
	                _this.draggedAxis === 'x' && _this.isRtl
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
	            _this.isDragging = false;
	            var elDocument = getElementDocument(_this.el);
	            var elWindow = getElementWindow(_this.el);
	            e.preventDefault();
	            e.stopPropagation();
	            removeClasses(_this.el, _this.classNames.dragging);
	            _this.onStopScrolling();
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
	        this.onMouseMove = throttle$1(this._onMouseMove, 64);
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
	        if (this.isDragging)
	            return;
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
	        this.isDragging = true;
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
	        tabIndex: 0,
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
	 * simplebar - v6.2.7
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

	var _a = SimpleBarCore.helpers, getOptions = _a.getOptions, addClasses = _a.addClasses, canUseDOM = _a.canUseDOM;
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
	            (_a = this.contentWrapperEl) === null || _a === void 0 ? void 0 : _a.setAttribute('tabindex', this.options.tabIndex.toString());
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
	                var _a;
	                if (removedNode.nodeType === 1) {
	                    if (removedNode.getAttribute('data-simplebar') === 'init') {
	                        !document.documentElement.contains(removedNode) &&
	                            ((_a = SimpleBar.instances.get(removedNode)) === null || _a === void 0 ? void 0 : _a.unMount());
	                    }
	                    else {
	                        Array.prototype.forEach.call(removedNode.querySelectorAll('[data-simplebar="init"]'), function (el) {
	                            var _a;
	                            !document.documentElement.contains(el) &&
	                                ((_a = SimpleBar.instances.get(el)) === null || _a === void 0 ? void 0 : _a.unMount());
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
	if (canUseDOM) {
	    SimpleBar.initHtmlApi();
	}

	SimpleBar_1[FILENAME] = 'src/components/SimpleBar.svelte';

	var root$h = add_locations(from_html(`<div><div class="simplebar-wrapper"><div class="simplebar-height-auto-observer-wrapper"><div class="simplebar-height-auto-observer"></div></div> <div class="simplebar-mask"><div class="simplebar-offset"><div class="simplebar-content-wrapper"><div class="simplebar-content"><!></div></div></div></div> <div class="simplebar-placeholder"></div></div> <div class="simplebar-track simplebar-horizontal"><div class="simplebar-scrollbar"></div></div> <div class="simplebar-track simplebar-vertical"><div class="simplebar-scrollbar"></div></div></div>`), SimpleBar_1[FILENAME], [
		[
			14,
			0,
			[
				[
					15,
					1,
					[
						[16, 2, [[17, 3]]],
						[19, 2, [[20, 3, [[21, 4, [[22, 5]]]]]]],
						[28, 2]
					]
				],
				[30, 1, [[31, 2]]],
				[33, 1, [[34, 2]]]
			]
		]
	]);

	function SimpleBar_1($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		let maxHeight = prop($$props, 'maxHeight', 8, "300px");
		let container = mutable_source();

		onMount(() => {
			new SimpleBar(get$1(container));
		});

		var $$exports = { ...legacy_api() };

		init();

		var div = root$h();
		var div_1 = child(div);
		var div_2 = sibling(child(div_1), 2);
		var div_3 = child(div_2);
		var div_4 = child(div_3);
		var div_5 = child(div_4);
		var node = child(div_5);

		slot(node, $$props, 'default', {});
		bind_this(div, ($$value) => set(container, $$value), () => get$1(container));
		template_effect(() => set_style(div, `max-height: ${maxHeight() ?? ''}`));
		append($$anchor, div);

		return pop($$exports);
	}

	const projects = writable([]);
	const menuActive = writable(null);

	// ─── Fix PATH for production builds ──────────────────────────────────────────
	// Packaged Electron apps launched from Finder/Dock don't inherit the user's
	// terminal PATH.  We first try to read the real PATH from the user's login
	// shell; if that fails we fall back to a list of well-known directories.
	(function fixProductionPath() {
		if (process.platform === "win32") {
			const appData = process.env.APPDATA || "";
			const pf = process.env["ProgramFiles"] || "C:\\Program Files";
			const extra = [path.join(appData, "npm"), path.join(pf, "nodejs")];
			const current = (process.env.PATH || "").split(";");
			process.env.PATH = [...new Set([...extra, ...current])].join(";");
			return;
		}

		// macOS / Linux — try the user's real shell first
		try {
			const shell = process.env.SHELL || "/bin/zsh";
			const marker = "__NPMAX_PATH__";
			const raw = child_process.execFileSync(
				shell,
				["-ilc", `printf "${marker}%s${marker}" "$PATH"`],
				{ timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
			);
			const m = raw.match(new RegExp(`${marker}(.+?)${marker}`));
			if (m && m[1].includes("/")) {
				process.env.PATH = m[1];
				return;
			}
		} catch {
			/* fall through to manual list */
		}

		// Fallback: prepend well-known directories
		const home = process.env.HOME || "";
		const extra = [
			"/usr/local/bin",
			"/opt/homebrew/bin",
			"/opt/homebrew/sbin",
			"/opt/local/bin",
			"/usr/bin",
			"/bin",
			path.join(home, ".volta", "bin"),
			path.join(home, ".yarn", "bin"),
			path.join(home, ".cargo", "bin"),
			path.join(home, ".local", "bin"),
			path.join(home, ".fnm", "aliases", "default", "bin"),
		];

		// Detect NVM — find the newest installed Node version
		const nvmDir = process.env.NVM_DIR || path.join(home, ".nvm");
		try {
			const versionsDir = path.join(nvmDir, "versions", "node");
			const versions = fs
				.readdirSync(versionsDir)
				.filter((v) => v.startsWith("v"))
				.sort()
				.reverse();
			if (versions.length > 0) {
				extra.push(path.join(versionsDir, versions[0], "bin"));
			}
		} catch {
			/* nvm not installed */
		}

		const current = (process.env.PATH || "").split(":");
		process.env.PATH = [...new Set([...extra, ...current])].join(":");
	})();

	const exec = util.promisify(child_process.exec);
	const readFile = util.promisify(fs.readFile);
	const writeFile = util.promisify(fs.writeFile);

	const SHELL =
		process.platform === "win32" ? undefined : process.env.SHELL || "/bin/zsh";

	const EXEC_OPTS = { timeout: 15000, shell: SHELL };

	/** Returns installed versions of npm, yarn, pnpm, composer (false if not found). */
	const globalPackages = async () => {
		const [npm, yarn, pnpm, composer] = await Promise.allSettled([
			npmVersion(),
			yarnVersion(),
			pnpmVersion(),
			composerVersion(),
		]);
		return {
			npm: npm.status === "fulfilled" ? npm.value : false,
			yarn: yarn.status === "fulfilled" ? yarn.value : false,
			pnpm: pnpm.status === "fulfilled" ? pnpm.value : false,
			composer: composer.status === "fulfilled" ? composer.value : false,
		};
	};

	const openDirectory = async () => electron.ipcRenderer.invoke("show-open-dialog");

	/** Read a project's composer.json and return the raw JSON string. */
	const getProjectComposerPackages = (projectPath) =>
		readFile(path.join(projectPath, "composer.json"), "utf-8");

	/**
	 * Write an updated version back into the project's composer.json.
	 * Preserves the original version constraint prefix (^, ~, >=, etc.).
	 * Returns the new version string, or null on failure.
	 */
	const updateComposerPackageVersion = async (
		projectPath,
		packageName,
		latestVersion,
		isDev,
	) => {
		const composerPath = path.join(projectPath, "composer.json");
		const raw = await readFile(composerPath, "utf-8");
		const composer = JSON.parse(raw);

		const section = isDev ? "require-dev" : "require";
		if (!composer[section]?.[packageName]) return null;

		const prefix = (composer[section][packageName].match(/^[^\d]*/) ?? ["^"])[0];
		const updated = prefix + latestVersion;
		composer[section][packageName] = updated;

		await writeFile(
			composerPath,
			JSON.stringify(composer, null, 4) + "\n",
			"utf-8",
		);
		return updated;
	};

	/**
	 * Check composer.lock status for a project.
	 * Returns: "ok" | "stale" | "missing"
	 */
	const checkComposerLockFile = (projectPath) => {
		const composerPath = path.join(projectPath, "composer.json");
		const lockPath = path.join(projectPath, "composer.lock");

		try {
			fs.accessSync(lockPath);
		} catch {
			return "missing";
		}

		try {
			const composerMtime = fs.statSync(composerPath).mtimeMs;
			const lockMtime = fs.statSync(lockPath).mtimeMs;
			return composerMtime > lockMtime ? "stale" : "ok";
		} catch {
			return "missing";
		}
	};

	/**
	 * Run `composer install` in the project directory.
	 * Returns the stdout on success.
	 */
	const runComposerInstall = async (projectPath) => {
		const { stdout } = await exec("composer install", {
			...EXEC_OPTS,
			cwd: projectPath,
			timeout: 120000,
		});
		return stdout;
	};

	/** Read a project's package.json and return the raw JSON string. */
	const getProjectPackages = (projectPath) =>
		readFile(path.join(projectPath, "package.json"), "utf-8");

	/**
	 * Write an updated version back into the project's package.json.
	 * Preserves the original semver prefix (^, ~, etc.).
	 * Returns the new version string, or null on failure.
	 */
	const updatePackageVersion = async (
		projectPath,
		packageName,
		latestVersion,
		isDev,
	) => {
		const pkgPath = path.join(projectPath, "package.json");
		const raw = await readFile(pkgPath, "utf-8");
		const pkg = JSON.parse(raw);

		const section = isDev ? "devDependencies" : "dependencies";
		if (!pkg[section]?.[packageName]) return null;

		const prefix = (pkg[section][packageName].match(/^[^\d]*/) ?? ["^"])[0];
		const updated = prefix + latestVersion;
		pkg[section][packageName] = updated;

		await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
		return updated;
	};

	/**
	 * Check lock file status for a project.
	 * Returns: "ok" | "stale" | "missing"
	 *  - "missing" – no lock file found
	 *  - "stale"   – package.json is newer than the lock file
	 *  - "ok"      – lock file is up-to-date
	 */
	const checkLockFile = (projectPath) => {
		const pkgPath = path.join(projectPath, "package.json");
		const locks = [
			path.join(projectPath, "package-lock.json"),
			path.join(projectPath, "yarn.lock"),
			path.join(projectPath, "pnpm-lock.yaml"),
		];

		let lockPath = null;
		for (const l of locks) {
			try {
				fs.accessSync(l);
				lockPath = l;
				break;
			} catch {
				/* not found */
			}
		}

		if (!lockPath) return "missing";

		try {
			const pkgMtime = fs.statSync(pkgPath).mtimeMs;
			const lockMtime = fs.statSync(lockPath).mtimeMs;
			return pkgMtime > lockMtime ? "stale" : "ok";
		} catch {
			return "missing";
		}
	};

	/**
	 * Run the appropriate install command (npm/yarn/pnpm) in the project directory.
	 * Auto-detects the package manager from the lock file or falls back to npm.
	 * Returns the stdout on success.
	 */
	const runInstall = async (projectPath) => {
		let cmd = "npm install";
		try {
			fs.accessSync(path.join(projectPath, "yarn.lock"));
			cmd = "yarn install";
		} catch {
			try {
				fs.accessSync(path.join(projectPath, "pnpm-lock.yaml"));
				cmd = "pnpm install";
			} catch {
				/* default to npm */
			}
		}

		const { stdout } = await exec(cmd, {
			...EXEC_OPTS,
			cwd: projectPath,
			timeout: 120000,
		});
		return stdout;
	};

	const npmVersion = async () => {
		try {
			const { stdout } = await exec("npm --version", EXEC_OPTS);
			return stdout.trim();
		} catch {
			return false;
		}
	};

	const yarnVersion = async () => {
		try {
			const { stdout } = await exec("yarn --version", EXEC_OPTS);
			return stdout.trim();
		} catch {
			return false;
		}
	};

	const pnpmVersion = async () => {
		try {
			const { stdout } = await exec("pnpm --version", EXEC_OPTS);
			return stdout.trim();
		} catch {
			return false;
		}
	};

	const composerVersion = async () => {
		try {
			const { stdout } = await exec("composer --version --no-ansi", EXEC_OPTS);
			const match = stdout.match(/(\d+\.\d+\.\d+)/);
			return match ? match[1] : stdout.trim();
		} catch {
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

	Npm[FILENAME] = 'src/icons/npm.svelte';

	var root$g = add_locations(from_svg(`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M 0 10 L 0 21 L 9 21 L 9 23 L 16 23 L 16 21 L 32 21 L 32 10 L 0 10 z M 1.7773438 11.777344 L 8.8886719 11.777344 L 8.890625 11.777344 L 8.890625 19.445312 L 7.1113281 19.445312 L 7.1113281 13.556641 L 5.3339844 13.556641 L 5.3339844 19.445312 L 1.7773438 19.445312 L 1.7773438 11.777344 z M 10.667969 11.777344 L 17.777344 11.777344 L 17.779297 11.777344 L 17.779297 19.443359 L 14.222656 19.443359 L 14.222656 21.222656 L 10.667969 21.222656 L 10.667969 11.777344 z M 19.556641 11.777344 L 30.222656 11.777344 L 30.224609 11.777344 L 30.224609 19.445312 L 28.445312 19.445312 L 28.445312 13.556641 L 26.667969 13.556641 L 26.667969 19.445312 L 24.890625 19.445312 L 24.890625 13.556641 L 23.111328 13.556641 L 23.111328 19.445312 L 19.556641 19.445312 L 19.556641 11.777344 z M 14.222656 13.556641 L 14.222656 17.667969 L 16 17.667969 L 16 13.556641 L 14.222656 13.556641 z"></path></svg>`), Npm[FILENAME], [[1, 0, [[2, 1]]]]);

	function Npm($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var svg = root$g();

		append($$anchor, svg);

		return pop($$exports);
	}

	Pnpm[FILENAME] = 'src/icons/pnpm.svelte';

	var root$f = add_locations(from_svg(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" viewBox="66.09157809474142 33.5 184.5 184.49999999999997"><defs><path d="M237.6 95L187.6 95L187.6 45L237.6 45L237.6 95Z" id="bj0tb0Y8q"></path><path d="M182.59 95L132.59 95L132.59 45L182.59 45L182.59 95Z" id="dkDSTzPj3"></path><path d="M127.59 95L77.59 95L77.59 45L127.59 45L127.59 95Z" id="a4vNdcNLpF"></path><path d="M237.6 150L187.6 150L187.6 100L237.6 100L237.6 150Z" id="h2t4Zj1jSU"></path><path d="M182.59 150L132.59 150L132.59 100L182.59 100L182.59 150Z" id="b4t5pngwvT"></path><path d="M182.59 205L132.59 205L132.59 155L182.59 155L182.59 205Z" id="b9s1gd5m2"></path><path d="M237.6 205L187.6 205L187.6 155L237.6 155L237.6 205Z" id="cmt9WLvz7"></path><path d="M127.59 205L77.59 205L77.59 155L127.59 155L127.59 205Z" id="bJUNqgFSg"></path></defs><g><g><use xlink:href="#bj0tb0Y8q" opacity="1" fill="#f9ad00" fill-opacity="1"></use></g><g><use xlink:href="#dkDSTzPj3" opacity="1" fill="#f9ad00" fill-opacity="1"></use></g><g><use xlink:href="#a4vNdcNLpF" opacity="1" fill="#f9ad00" fill-opacity="1"></use></g><g><use xlink:href="#h2t4Zj1jSU" opacity="1" fill="#f9ad00" fill-opacity="1"></use></g><g><use xlink:href="#b4t5pngwvT" opacity="1" fill="#4e4e4e" fill-opacity="1"></use></g><g><use xlink:href="#b9s1gd5m2" opacity="1" fill="#4e4e4e" fill-opacity="1"></use></g><g><use xlink:href="#cmt9WLvz7" opacity="1" fill="#4e4e4e" fill-opacity="1"></use></g><g><use xlink:href="#bJUNqgFSg" opacity="1" fill="#4e4e4e" fill-opacity="1"></use></g></g></svg>`), Pnpm[FILENAME], [
		[
			1,
			0,
			[
				[
					8,
					1,
					[
						[9, 2],
						[10, 2],
						[14, 2],
						[18, 2],
						[22, 2],
						[26, 2],
						[30, 2],
						[34, 2]
					]
				],

				[
					39,
					1,
					[
						[40, 2, [[41, 3]]],
						[48, 2, [[49, 3]]],
						[56, 2, [[57, 3]]],
						[64, 2, [[65, 3]]],
						[72, 2, [[73, 3]]],
						[80, 2, [[81, 3]]],
						[88, 2, [[89, 3]]],
						[96, 2, [[97, 3]]]
					]
				]
			]
		]
	]);

	function Pnpm($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var svg = root$f();

		append($$anchor, svg);

		return pop($$exports);
	}

	Yarn[FILENAME] = 'src/icons/yarn.svelte';

	var root$e = add_locations(from_svg(`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M 16 3 C 8.8 3 3 8.8 3 16 C 3 23.2 8.8 29 16 29 C 23.2 29 29 23.2 29 16 C 29 8.8 23.2 3 16 3 z M 16 5 C 22.1 5 27 9.9 27 16 C 27 22.1 22.1 27 16 27 C 9.9 27 5 22.1 5 16 C 5 9.9 9.9 5 16 5 z M 16.208984 9.0449219 C 15.75918 9.1214844 15.300781 10.5 15.300781 10.5 C 15.300781 10.5 14.099609 10.300781 13.099609 11.300781 C 12.899609 11.500781 12.700391 11.599219 12.400391 11.699219 C 12.300391 11.799219 12.2 11.800391 12 12.400391 C 11.6 13.300391 12.599609 14.400391 12.599609 14.400391 C 10.499609 15.900391 10.599219 17.900391 10.699219 18.400391 C 9.3992187 19.500391 9.8992187 20.900781 10.199219 21.300781 C 10.399219 21.600781 10.599219 21.5 10.699219 21.5 C 10.699219 21.6 10.199219 22.200391 10.699219 22.400391 C 11.199219 22.700391 12.000391 22.800391 12.400391 22.400391 C 12.700391 22.100391 12.800391 21.499219 12.900391 21.199219 C 13.000391 21.099219 13.000391 21.399609 13.400391 21.599609 C 13.400391 21.599609 12.7 21.899609 13 22.599609 C 13.1 22.799609 13.4 23 14 23 C 14.2 23 16.599219 22.899219 17.199219 22.699219 C 17.599219 22.599219 17.699219 22.400391 17.699219 22.400391 C 20.299219 21.700391 20.799609 20.599219 22.599609 20.199219 C 23.199609 20.099219 23.199609 19.099219 22.099609 19.199219 C 21.299609 19.199219 20.6 19.6 20 20 C 19 20.6 18.300781 20.699609 18.300781 20.599609 C 18.200781 20.499609 18.699219 19.3 18.199219 18 C 17.699219 16.6 16.800391 16.199609 16.900391 16.099609 C 17.200391 15.599609 17.899219 14.800391 18.199219 13.400391 C 18.299219 12.500391 18.300391 11.000781 17.900391 10.300781 C 17.800391 10.100781 17.199219 10.5 17.199219 10.5 C 17.199219 10.5 16.600391 9.1996094 16.400391 9.0996094 C 16.337891 9.0496094 16.273242 9.0339844 16.208984 9.0449219 z"></path></svg>`), Yarn[FILENAME], [[1, 0, [[2, 1]]]]);

	function Yarn($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var svg = root$e();

		append($$anchor, svg);

		return pop($$exports);
	}

	Composer[FILENAME] = 'src/icons/composer.svelte';

	var root$d = add_locations(from_svg(`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" fill="none" stroke="currentColor" stroke-width="2.5"></path><text x="16" y="21.5" text-anchor="middle" font-size="13" font-weight="700" font-family="'SF Mono', 'Cascadia Code', monospace" fill="currentColor">C</text></svg>`), Composer[FILENAME], [[2, 0, [[3, 1], [9, 1]]]]);

	function Composer($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var svg = root$d();

		append($$anchor, svg);

		return pop($$exports);
	}

	Sidebar[FILENAME] = 'src/components/sidebar.svelte';

	var root_3$2 = add_locations(from_html(`<div><button class="projectItem__btn svelte-1gr7gr8"><svg class="projectItem__icon svelte-1gr7gr8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"></path></svg> <span class="projectItem__name svelte-1gr7gr8"> </span></button> <button class="projectItem__remove svelte-1gr7gr8" aria-label="Remove project"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg" class="svelte-1gr7gr8"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button> <button class="projectItem__close svelte-1gr7gr8" aria-label="Close project"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg" class="svelte-1gr7gr8"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg></button></div>`), Sidebar[FILENAME], [
		[
			71,
			7,
			[
				[75, 8, [[79, 9, [[87, 10]]], [91, 9]]],
				[
					93,
					8,
					[[98, 9, [[105, 10], [106, 10], [109, 10], [110, 10]]]]
				],
				[113, 8, [[118, 9, [[125, 10], [126, 10]]]]]
			]
		]
	]);

	var root_4$4 = add_locations(from_html(`<p class="sidebarSection__empty svelte-1gr7gr8">No projects yet</p>`), Sidebar[FILENAME], [[132, 6]]);
	var root_1$3 = add_locations(from_html(`<div class="sidebar__scroll-content svelte-1gr7gr8"><section class="sidebarSection"><h2 class="sidebarSection__label svelte-1gr7gr8">Projects</h2> <!></section></div>`), Sidebar[FILENAME], [[65, 3, [[66, 4, [[67, 5]]]]]]);
	var root_6$3 = add_locations(from_html(`<div class="pkgItem svelte-1gr7gr8"><figure class="pkgItem__icon svelte-1gr7gr8"><!></figure> <span class="pkgItem__name svelte-1gr7gr8">npm</span> <span class="pkgItem__badge svelte-1gr7gr8"> </span></div>`), Sidebar[FILENAME], [[162, 4, [[163, 5], [164, 5], [165, 5]]]]);
	var root_7$3 = add_locations(from_html(`<div class="pkgItem svelte-1gr7gr8"><figure class="pkgItem__icon svelte-1gr7gr8"><!></figure> <span class="pkgItem__name svelte-1gr7gr8">yarn</span> <span class="pkgItem__badge svelte-1gr7gr8"> </span></div>`), Sidebar[FILENAME], [[169, 4, [[170, 5], [171, 5], [172, 5]]]]);
	var root_8$2 = add_locations(from_html(`<div class="pkgItem svelte-1gr7gr8"><figure class="pkgItem__icon svelte-1gr7gr8"><!></figure> <span class="pkgItem__name svelte-1gr7gr8">pnpm</span> <span class="pkgItem__badge svelte-1gr7gr8"> </span></div>`), Sidebar[FILENAME], [[176, 4, [[177, 5], [178, 5], [179, 5]]]]);
	var root_9$2 = add_locations(from_html(`<div class="pkgItem svelte-1gr7gr8"><figure class="pkgItem__icon svelte-1gr7gr8"><!></figure> <span class="pkgItem__name svelte-1gr7gr8">composer</span> <span class="pkgItem__badge svelte-1gr7gr8"> </span></div>`), Sidebar[FILENAME], [[183, 4, [[184, 5], [185, 5], [186, 5]]]]);
	var root_5$3 = add_locations(from_html(`<section class="sidebarSection" style="padding-left: 8px;padding-right: 8px; padding-bottom: 8px;"><h2 class="sidebarSection__label svelte-1gr7gr8" style="text-align: center;">Package Managers</h2> <!> <!> <!> <!></section>`), Sidebar[FILENAME], [[154, 2, [[158, 3]]]]);

	var root$c = add_locations(from_html(`<aside class="sidebar svelte-1gr7gr8"><div><div class="sidebar__titlebar svelte-1gr7gr8"></div> <!> <button class="sidebar__addBtn svelte-1gr7gr8"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg" class="svelte-1gr7gr8"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Project</button></div> <!></aside>`), Sidebar[FILENAME], [
		[
			59,
			0,
			[
				[60, 1, [[62, 2], [138, 2, [[139, 3, [[146, 4], [147, 4]]]]]]]
			]
		]
	]);

	function Sidebar($$anchor, $$props) {
		check_target(new.target);
		push($$props, true);

		const $projects = () => (
			validate_store(projects),
			store_get(projects, '$projects', $$stores)
		);

		const $menuActive = () => (
			validate_store(menuActive),
			store_get(menuActive, '$menuActive', $$stores)
		);

		const [$$stores, $$cleanup] = setup_stores();
		let packages = tag(state(proxy({})), 'packages');

		onMount(async () => {
			set(packages, isJson(localStorage.getItem("packages")) ? JSON.parse(localStorage.getItem("packages")) : {}, true);

			projects.set(strict_equals(localStorage.getItem("projects"), "null", false)
				? JSON.parse(localStorage.getItem("projects") || "[]")
				: []);

			set(packages, (await track_reactivity_loss(globalPackages()))(), true);
			localStorage.setItem("packages", JSON.stringify(get$1(packages)));
		});

		async function addProject() {
			try {
				const result = (await track_reactivity_loss(openDirectory()))();

				if (result.length > 0) {
					const projectPath = result[0];
					const projectPathArray = result[0].split("/");
					const projectName = projectPathArray[projectPathArray.length - 1];

					projects.update((list) => {
						const newId = list.length > 0 ? list[list.length - 1].id + 1 : 0;

						return [...list, { id: newId, name: projectName, path: projectPath }];
					});

					localStorage.setItem("projects", JSON.stringify($projects()));
				}
			} catch(err) {
				console.error(...log_if_contains_state('error', err));
			}
		}

		function closeProject(id) {
			if (strict_equals($menuActive(), `project_${id}`)) {
				menuActive.set(null);
			}
		}

		function removeProject(id) {
			const filtered = $projects().filter((item) => strict_equals(item.id, id, false));

			projects.set(filtered);
			menuActive.set(null);
			localStorage.setItem("projects", JSON.stringify(filtered));
		}

		var $$exports = { ...legacy_api() };
		var aside = root$c();
		var div = child(aside);
		var node = sibling(child(div), 2);

		add_svelte_meta(
			() => SimpleBar_1(node, {
				maxHeight: "calc(100vh - 120px)",
				children: wrap_snippet(Sidebar, ($$anchor, $$slotProps) => {
					var div_1 = root_1$3();
					var section = child(div_1);
					var node_1 = sibling(child(section), 2);

					{
						var consequent = ($$anchor) => {
							var fragment = comment();
							var node_2 = first_child(fragment);

							add_svelte_meta(
								() => each(node_2, 1, $projects, index, ($$anchor, $$item) => {
									let id = () => get$1($$item).id;

									id();

									let name = () => get$1($$item).name;

									name();

									var div_2 = root_3$2();
									let classes;
									var button = child(div_2);
									var span = sibling(child(button), 2);
									var text = child(span, true);

									reset(span);
									reset(button);

									var button_1 = sibling(button, 2);
									var button_2 = sibling(button_1, 2);

									reset(div_2);

									template_effect(() => {
										classes = set_class(div_2, 1, 'projectItem svelte-1gr7gr8', null, classes, {
											'projectItem--active': strict_equals($menuActive(), `project_${id()}`)
										});

										set_text(text, name());
									});

									delegated('click', button, function click() {
										return menuActive.set(`project_${id()}`);
									});

									delegated('click', button_1, function click_1() {
										return removeProject(id());
									});

									delegated('click', button_2, function click_2() {
										return closeProject(id());
									});

									append($$anchor, div_2);
								}),
								'each',
								Sidebar,
								70,
								6
							);

							append($$anchor, fragment);
						};

						var alternate = ($$anchor) => {
							var p = root_4$4();

							append($$anchor, p);
						};

						add_svelte_meta(
							() => if_block(node_1, ($$render) => {
								if ($projects() && $projects().length > 0) $$render(consequent); else $$render(alternate, -1);
							}),
							'if',
							Sidebar,
							69,
							5
						);
					}

					reset(section);
					reset(div_1);
					append($$anchor, div_1);
				}),
				$$slots: { default: true }
			}),
			'component',
			Sidebar,
			64,
			2,
			{ componentTag: 'SimpleBar' }
		);

		var button_3 = sibling(node, 2);

		var node_3 = sibling(div, 2);

		{
			var consequent_5 = ($$anchor) => {
				var section_1 = root_5$3();
				var node_4 = sibling(child(section_1), 2);

				{
					var consequent_1 = ($$anchor) => {
						var div_3 = root_6$3();
						var figure = child(div_3);
						var node_5 = child(figure);

						add_svelte_meta(() => Npm(node_5, {}), 'component', Sidebar, 163, 35, { componentTag: 'NpmIcon' });

						var span_1 = sibling(figure, 4);
						var text_1 = child(span_1);
						template_effect(($0) => set_text(text_1, $0), [() => get$1(packages).npm.trim()]);
						append($$anchor, div_3);
					};

					add_svelte_meta(
						() => if_block(node_4, ($$render) => {
							if (get$1(packages).npm) $$render(consequent_1);
						}),
						'if',
						Sidebar,
						161,
						3
					);
				}

				var node_6 = sibling(node_4, 2);

				{
					var consequent_2 = ($$anchor) => {
						var div_4 = root_7$3();
						var figure_1 = child(div_4);
						var node_7 = child(figure_1);

						add_svelte_meta(() => Yarn(node_7, {}), 'component', Sidebar, 170, 35, { componentTag: 'YarnIcon' });

						var span_2 = sibling(figure_1, 4);
						var text_2 = child(span_2);
						template_effect(($0) => set_text(text_2, $0), [() => get$1(packages).yarn.trim()]);
						append($$anchor, div_4);
					};

					add_svelte_meta(
						() => if_block(node_6, ($$render) => {
							if (get$1(packages).yarn) $$render(consequent_2);
						}),
						'if',
						Sidebar,
						168,
						3
					);
				}

				var node_8 = sibling(node_6, 2);

				{
					var consequent_3 = ($$anchor) => {
						var div_5 = root_8$2();
						var figure_2 = child(div_5);
						var node_9 = child(figure_2);

						add_svelte_meta(() => Pnpm(node_9, {}), 'component', Sidebar, 177, 35, { componentTag: 'PnpmIcon' });

						var span_3 = sibling(figure_2, 4);
						var text_3 = child(span_3);
						template_effect(($0) => set_text(text_3, $0), [() => get$1(packages).pnpm.trim()]);
						append($$anchor, div_5);
					};

					add_svelte_meta(
						() => if_block(node_8, ($$render) => {
							if (get$1(packages).pnpm) $$render(consequent_3);
						}),
						'if',
						Sidebar,
						175,
						3
					);
				}

				var node_10 = sibling(node_8, 2);

				{
					var consequent_4 = ($$anchor) => {
						var div_6 = root_9$2();
						var figure_3 = child(div_6);
						var node_11 = child(figure_3);

						add_svelte_meta(() => Composer(node_11, {}), 'component', Sidebar, 184, 35, { componentTag: 'ComposerIcon' });

						var span_4 = sibling(figure_3, 4);
						var text_4 = child(span_4);
						template_effect(($0) => set_text(text_4, $0), [() => get$1(packages).composer.trim()]);
						append($$anchor, div_6);
					};

					add_svelte_meta(
						() => if_block(node_10, ($$render) => {
							if (get$1(packages).composer) $$render(consequent_4);
						}),
						'if',
						Sidebar,
						182,
						3
					);
				}
				append($$anchor, section_1);
			};

			add_svelte_meta(
				() => if_block(node_3, ($$render) => {
					if (get$1(packages).npm || get$1(packages).yarn || get$1(packages).pnpm || get$1(packages).composer) $$render(consequent_5);
				}),
				'if',
				Sidebar,
				153,
				1
			);
		}
		delegated('click', button_3, addProject);
		append($$anchor, aside);

		var $$pop = pop($$exports);

		$$cleanup();

		return $$pop;
	}

	delegate(['click']);

	/** @import { BlurParams, CrossfadeParams, DrawParams, FadeParams, FlyParams, ScaleParams, SlideParams, TransitionConfig } from './public' */


	/**
	 * @param {number} t
	 * @returns {number}
	 */
	function cubic_in_out(t) {
		return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
	}

	/** @param {number | string} value
	 * @returns {[number, string]}
	 */
	function split_css_unit(value) {
		const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
		return split ? [parseFloat(split[1]), split[2] || 'px'] : [/** @type {number} */ (value), 'px'];
	}

	/**
	 * Animates a `blur` filter alongside an element's opacity.
	 *
	 * @param {Element} node
	 * @param {BlurParams} [params]
	 * @returns {TransitionConfig}
	 */
	function blur(
		node,
		{ delay = 0, duration = 400, easing = cubic_in_out, amount = 5, opacity = 0 } = {}
	) {
		const style = getComputedStyle(node);
		const target_opacity = +style.opacity;
		const f = style.filter === 'none' ? '' : style.filter;
		const od = target_opacity * (1 - opacity);
		const [value, unit] = split_css_unit(amount);
		return {
			delay,
			duration,
			easing,
			css: (_t, u) => `opacity: ${target_opacity - od * u}; filter: ${f} blur(${u * value}${unit});`
		};
	}

	Loader[FILENAME] = 'node_modules/svelte-sonner/dist/Loader.svelte';

	const bars = Array(12).fill(0);
	var root_1$2 = add_locations(from_html(`<div class="sonner-loading-bar"></div>`), Loader[FILENAME], [[15, 3]]);
	var root$b = add_locations(from_html(`<div><div class="sonner-spinner"></div></div>`), Loader[FILENAME], [[9, 0, [[13, 1]]]]);

	function Loader($$anchor, $$props) {
		check_target(new.target);
		push($$props, true);

		var $$exports = { ...legacy_api() };
		var div = root$b();
		var div_1 = child(div);

		add_svelte_meta(
			() => each(div_1, 23, () => bars, (_, i) => `spinner-bar-${i}`, ($$anchor, _) => {
				var div_2 = root_1$2();

				append($$anchor, div_2);
			}),
			'each',
			Loader,
			14,
			2
		);

		template_effect(
			($0) => {
				set_class(div, 1, $0);
				set_attribute(div, 'data-visible', $$props.visible);
			},
			[
				() => clsx(['sonner-loading-wrapper', $$props.class].filter(Boolean).join(' '))
			]
		);

		append($$anchor, div);

		return pop($$exports);
	}

	function cn(...classes) {
	    return classes.filter(Boolean).join(' ');
	}
	const isBrowser = typeof document !== 'undefined';

	const defaultWindow = typeof window !== "undefined" ? window : undefined;

	/**
	 * Handles getting the active element in a document or shadow root.
	 * If the active element is within a shadow root, it will traverse the shadow root
	 * to find the active element.
	 * If not, it will return the active element in the document.
	 *
	 * @param document A document or shadow root to get the active element from.
	 * @returns The active element in the document or shadow root.
	 */
	function getActiveElement(document) {
	    let activeElement = document.activeElement;
	    while (activeElement?.shadowRoot) {
	        const node = activeElement.shadowRoot.activeElement;
	        if (node === activeElement)
	            break;
	        else
	            activeElement = node;
	    }
	    return activeElement;
	}

	/* active-element.svelte.js generated by Svelte v5.53.7 */

	class ActiveElement {
		#document;
		#subscribe;

		constructor(options = {}) {
			const { window = defaultWindow, document = window?.document } = options;

			if (strict_equals(window, undefined)) return;

			this.#document = document;

			this.#subscribe = createSubscriber((update) => {
				const cleanupFocusIn = on(window, "focusin", update);
				const cleanupFocusOut = on(window, "focusout", update);

				return () => {
					cleanupFocusIn();
					cleanupFocusOut();
				};
			});
		}

		get current() {
			this.#subscribe?.();

			if (!this.#document) return null;

			return getActiveElement(this.#document);
		}
	}

	/**
	 * An object holding a reactive value that is equal to `document.activeElement`.
	 * It automatically listens for changes, keeping the reference up to date.
	 *
	 * If you wish to use a custom document or shadowRoot, you should use
	 * [useActiveElement](https://runed.dev/docs/utilities/active-element) instead.
	 *
	 * @see {@link https://runed.dev/docs/utilities/active-element}
	 */
	new ActiveElement();

	class Context {
	    #name;
	    #key;
	    /**
	     * @param name The name of the context.
	     * This is used for generating the context key and error messages.
	     */
	    constructor(name) {
	        this.#name = name;
	        this.#key = Symbol(name);
	    }
	    /**
	     * The key used to get and set the context.
	     *
	     * It is not recommended to use this value directly.
	     * Instead, use the methods provided by this class.
	     */
	    get key() {
	        return this.#key;
	    }
	    /**
	     * Checks whether this has been set in the context of a parent component.
	     *
	     * Must be called during component initialisation.
	     */
	    exists() {
	        return hasContext(this.#key);
	    }
	    /**
	     * Retrieves the context that belongs to the closest parent component.
	     *
	     * Must be called during component initialisation.
	     *
	     * @throws An error if the context does not exist.
	     */
	    get() {
	        const context = getContext(this.#key);
	        if (context === undefined) {
	            throw new Error(`Context "${this.#name}" not found`);
	        }
	        return context;
	    }
	    /**
	     * Retrieves the context that belongs to the closest parent component,
	     * or the given fallback value if the context does not exist.
	     *
	     * Must be called during component initialisation.
	     */
	    getOr(fallback) {
	        const context = getContext(this.#key);
	        if (context === undefined) {
	            return fallback;
	        }
	        return context;
	    }
	    /**
	     * Associates the given value with the current component and returns it.
	     *
	     * Must be called during component initialisation.
	     */
	    set(context) {
	        return setContext(this.#key, context);
	    }
	}

	const sonnerContext = new Context('<Toaster/>');

	/* toast-state.svelte.js generated by Svelte v5.53.7 */

	let toastsCounter = 0;

	class ToastState {
		#toasts = tag(state(proxy([])), 'ToastState.toasts');

		get toasts() {
			return get$1(this.#toasts);
		}

		set toasts(value) {
			set(this.#toasts, value, true);
		}

		#heights = tag(state(proxy([])), 'ToastState.heights');

		get heights() {
			return get$1(this.#heights);
		}

		set heights(value) {
			set(this.#heights, value, true);
		}

		#findToastIdx = (id) => {
			const idx = this.toasts.findIndex((toast) => strict_equals(toast.id, id));

			if (strict_equals(idx, -1)) return null;

			return idx;
		};

		addToast = (data) => {
			if (!isBrowser) return;

			this.toasts.unshift(data);
		};

		updateToast = ({ id, data, type, message }) => {
			const toastIdx = this.toasts.findIndex((toast) => strict_equals(toast.id, id));
			const toastToUpdate = this.toasts[toastIdx];

			this.toasts[toastIdx] = {
				...toastToUpdate,
				...data,
				id,
				title: message,
				type,
				updated: true
			};
		};

		create = (data) => {
			const { message, ...rest } = data;
			const id = strict_equals(typeof data?.id, 'number') || data.id && data.id?.length > 0 ? data.id : toastsCounter++;

			// Support deprecated `dismissable` as a fallback for backwards compatibility
			const dismissible = strict_equals(data.dismissible, undefined, false)
				? data.dismissible
				: strict_equals(data.dismissable, undefined, false) ? data.dismissable : true;

			const type = strict_equals(data.type, undefined) ? 'default' : data.type;

			untrack(() => {
				const alreadyExists = this.toasts.find((toast) => strict_equals(toast.id, id));

				if (alreadyExists) {
					this.updateToast({ id, data, type, message, dismissible });
				} else {
					this.addToast({ ...rest, id, title: message, dismissible, type });
				}
			});

			return id;
		};

		dismiss = (id) => {
			untrack(() => {
				if (strict_equals(id, undefined)) {
					// we're dismissing all the toasts
					this.toasts = this.toasts.map((toast) => ({ ...toast, dismiss: true }));

					return;
				}

				// we're dismissing a specific toast
				const toastIdx = this.toasts.findIndex((toast) => strict_equals(toast.id, id));

				if (this.toasts[toastIdx]) {
					this.toasts[toastIdx] = { ...this.toasts[toastIdx], dismiss: true };
				}
			});

			return id;
		};

		remove = (id) => {
			if (strict_equals(id, undefined)) {
				// remove all toasts
				this.toasts = [];

				return;
			}

			// remove a specific toast
			const toastIdx = this.#findToastIdx(id);

			if (strict_equals(toastIdx, null)) return;

			this.toasts.splice(toastIdx, 1);

			return id;
		};

		message = (message, data) => {
			return this.create({ ...data, type: 'default', message });
		};

		error = (message, data) => {
			return this.create({ ...data, type: 'error', message });
		};

		success = (message, data) => {
			return this.create({ ...data, type: 'success', message });
		};

		info = (message, data) => {
			return this.create({ ...data, type: 'info', message });
		};

		warning = (message, data) => {
			return this.create({ ...data, type: 'warning', message });
		};

		loading = (message, data) => {
			return this.create({ ...data, type: 'loading', message });
		};

		promise = (promise, data) => {
			if (!data) {
				// Nothing to show
				return;
			}

			let id = undefined;

			if (strict_equals(data.loading, undefined, false)) {
				id = this.create({
					...data,
					promise,
					type: 'loading',
					message: strict_equals(typeof data.loading, 'string') ? data.loading : data.loading()
				});
			}

			const p = promise instanceof Promise ? promise : promise();
			let shouldDismiss = strict_equals(id, undefined, false);

			p.then((response) => {
				if (strict_equals(typeof response, 'object') && response && 'ok' in response && strict_equals(typeof response.ok, 'boolean') && !response.ok) {
					shouldDismiss = false;

					const message = constructPromiseErrorMessage(response);

					this.create({ id, type: 'error', message });
				} else if (strict_equals(data.success, undefined, false)) {
					shouldDismiss = false;

					const message = strict_equals(typeof data.success, 'function') ? data.success(response) : data.success;

					this.create({ id, type: 'success', message });
				}
			}).catch((error) => {
				if (strict_equals(data.error, undefined, false)) {
					shouldDismiss = false;

					const message = strict_equals(typeof data.error, 'function') ? data.error(error) : data.error;

					this.create({ id, type: 'error', message });
				}
			}).finally(() => {
				if (shouldDismiss) {
					// Toast is still in load state (and will be indefinitely — dismiss it)
					this.dismiss(id);

					id = undefined;
				}

				data.finally?.();
			});

			return id;
		};

		custom = (component, data) => {
			const id = data?.id || toastsCounter++;

			this.create({ component, id, ...data });

			return id;
		};

		removeHeight = (id) => {
			this.heights = this.heights.filter((height) => strict_equals(height.toastId, id, false));
		};

		setHeight = (data) => {
			const toastIdx = this.#findToastIdx(data.toastId);

			if (strict_equals(toastIdx, null)) {
				this.heights.push(data);

				return;
			}

			this.heights[toastIdx] = data;
		};

		reset = () => {
			this.toasts = [];
			this.heights = [];
		};
	}

	function constructPromiseErrorMessage(response) {
		if (response && strict_equals(typeof response, 'object') && 'status' in response) {
			return `HTTP error! Status: ${response.status}`;
		}

		return `Error! ${response}`;
	}

	const toastState = new ToastState();

	function toastFunction(message, data) {
		return toastState.create({ message, ...data });
	}

	class SonnerState {
		/**
		 * A derived state of the toasts that are not dismissed.
		 */
		#activeToasts = tag(user_derived(() => toastState.toasts.filter((toast) => !toast.dismiss)), 'SonnerState.#activeToasts');

		get toasts() {
			return get$1(this.#activeToasts);
		}
	}

	const basicToast = toastFunction;

	const toast = Object.assign(basicToast, {
		success: toastState.success,
		info: toastState.info,
		warning: toastState.warning,
		error: toastState.error,
		custom: toastState.custom,
		message: toastState.message,
		promise: toastState.promise,
		dismiss: toastState.dismiss,
		loading: toastState.loading,
		getActiveToasts: () => {
			return toastState.toasts.filter((toast) => !toast.dismiss);
		}
	});

	function isAction(action) {
	    return action.label !== undefined;
	}

	/* use-document-hidden.svelte.js generated by Svelte v5.53.7 */

	function useDocumentHidden() {
		let current = tag(state(proxy(strict_equals(typeof document, 'undefined', false) ? document.hidden : false)), 'current');

		user_effect(() => {
			return on(document, 'visibilitychange', () => {
				set(current, document.hidden, true);
			});
		});

		return {
			get current() {
				return get$1(current);
			}
		};
	}

	Toast[FILENAME] = 'node_modules/svelte-sonner/dist/Toast.svelte';

	const TOAST_LIFETIME$1 = 4000;
	const GAP$1 = 14;
	const SWIPE_THRESHOLD = 45;
	const TIME_BEFORE_UNMOUNT = 200;
	const SCALE_MULTIPLIER = 0.05;

	const DEFAULT_TOAST_CLASSES = {
		toast: '',
		title: '',
		description: '',
		loader: '',
		closeButton: '',
		cancelButton: '',
		actionButton: '',
		action: '',
		warning: '',
		error: '',
		success: '',
		default: '',
		info: '',
		loading: ''
	};

	function getDefaultSwipeDirections(position) {
		const [y, x] = position.split('-');
		const directions = [];

		if (y) {
			directions.push(y);
		}

		if (x) {
			directions.push(x);
		}

		return directions;
	}

	function getDampening(delta) {
		const factor = Math.abs(delta) / 20;

		return 1 / (1.5 + factor);
	}

	var root_2$4 = add_locations(from_html(`<div><!></div>`), Toast[FILENAME], [[318, 2]]);
	var root_4$3 = add_locations(from_html(`<button data-close-button=""><!></button>`), Toast[FILENAME], [[377, 2]]);
	var root_7$2 = add_locations(from_html(`<div data-icon=""><!> <!></div>`), Toast[FILENAME], [[397, 3]]);
	var root_20$2 = add_locations(from_html(`<div data-description=""><!></div>`), Toast[FILENAME], [[435, 4]]);
	var root_25$2 = add_locations(from_html(`<button data-button="" data-cancel=""> </button>`), Toast[FILENAME], [[457, 4]]);
	var root_28$2 = add_locations(from_html(`<button data-button=""> </button>`), Toast[FILENAME], [[480, 4]]);
	var root_6$2 = add_locations(from_html(`<!> <div data-content=""><div data-title=""><!></div> <!></div> <!> <!>`, 1), Toast[FILENAME], [[420, 2, [[421, 3]]]]);
	var root$a = add_locations(from_html(`<li aria-atomic="true" data-sonner-toast=""><!> <!></li>`), Toast[FILENAME], [[333, 0]]);

	function Toast($$anchor, $$props) {
		check_target(new.target);
		push($$props, true);

		const // height index is used to calculate the offset as it gets updated before the toast array, which means we can calculate the new layout faster.
		// use scaledRectHeight as it's more precise
		// toast was transitioning its scale, so scaledRectHeight isn't accurate
		// save the offset for the exit swipe animation
		// let the toast know it has started
		// get the elapsed time since the timer started
		// if the toast has been updated after the initial render,
		// we want to reset the timer and set the remaining time to the
		// new duration
		// ensure we maintain correct pointer capture even when going outside of the toast (e.g. when swiping)
		// remove only if threshold is met
		// Determine swipe direction if not already locked
		// handle vertical swipes
		// smoothly transition to dampened movement
		// ensure we don't jump when transition to dampened movement
		// handle horizontal swipes
		// Smoothly transition to dampened movement
		// Ensure we don't jump when transitioning to dampened movement
		LoadingIcon = wrap_snippet(Toast, function ($$anchor) {
			validate_snippet_args(...arguments);

			var fragment = comment();
			var node = first_child(fragment);

			{
				var consequent = ($$anchor) => {
					var div = root_2$4();
					var node_1 = child(div);

					add_svelte_meta(() => snippet(node_1, () => $$props.loadingIcon), 'render', Toast, 322, 3);
					reset(div);

					template_effect(
						($0) => {
							set_class(div, 1, $0);
							set_attribute(div, 'data-visible', strict_equals(get$1(toastType), 'loading'));
						},
						[
							() => clsx(cn(get$1(classes)?.loader, $$props.toast?.classes?.loader, 'sonner-loader'))
						]
					);

					append($$anchor, div);
				};

				var alternate = ($$anchor) => {
					{
						let $0 = user_derived(() => cn(get$1(classes)?.loader, $$props.toast.classes?.loader));
						let $1 = user_derived(() => strict_equals(get$1(toastType), 'loading'));

						add_svelte_meta(
							() => Loader($$anchor, {
								get class() {
									return get$1($0);
								},

								get visible() {
									return get$1($1);
								}
							}),
							'component',
							Toast,
							325,
							2,
							{ componentTag: 'Loader' }
						);
					}
				};

				add_svelte_meta(
					() => if_block(node, ($$render) => {
						if ($$props.loadingIcon) $$render(consequent); else $$render(alternate, -1);
					}),
					'if',
					Toast,
					317,
					1
				);
			}

			append($$anchor, fragment);
		});

		let cancelButtonStyle = prop($$props, 'cancelButtonStyle', 3, ''),
			actionButtonStyle = prop($$props, 'actionButtonStyle', 3, ''),
			descriptionClass = prop($$props, 'descriptionClass', 3, ''),
			unstyled = prop($$props, 'unstyled', 3, false),
			defaultRichColors = prop($$props, 'defaultRichColors', 3, false);

		const defaultClasses = { ...DEFAULT_TOAST_CLASSES };
		let mounted = tag(state(false), 'mounted');
		let removed = tag(state(false), 'removed');
		let swiping = tag(state(false), 'swiping');
		let swipeOut = tag(state(false), 'swipeOut');
		let isSwiped = tag(state(false), 'isSwiped');
		let offsetBeforeRemove = tag(state(0), 'offsetBeforeRemove');
		let initialHeight = tag(state(0), 'initialHeight');
		let remainingTime = $$props.toast.duration || $$props.duration || TOAST_LIFETIME$1;
		let toastRef = tag(state(void 0), 'toastRef');
		let swipeDirection = tag(state(null), 'swipeDirection');
		let swipeOutDirection = tag(state(null), 'swipeOutDirection');
		const isFront = tag(user_derived(() => strict_equals($$props.index, 0)), 'isFront');
		const isVisible = tag(user_derived(() => $$props.index + 1 <= $$props.visibleToasts), 'isVisible');
		const toastType = tag(user_derived(() => $$props.toast.type), 'toastType');

		const dismissible = tag(
			user_derived(() => strict_equals($$props.toast.dismissible, undefined, false)
				? strict_equals($$props.toast.dismissible, false, false)
				: strict_equals($$props.toast.dismissable, false, false)),
			'dismissible'
		);

		const toastClass = tag(user_derived(() => $$props.toast.class || ''), 'toastClass');
		const toastDescriptionClass = tag(user_derived(() => $$props.toast.descriptionClass || ''), 'toastDescriptionClass');
		const heightIndex = tag(user_derived(() => toastState.heights.findIndex((height) => strict_equals(height.toastId, $$props.toast.id)) || 0), 'heightIndex');
		const closeButton = tag(user_derived(() => $$props.toast.closeButton ?? $$props.closeButton), 'closeButton');
		const duration = tag(user_derived(() => $$props.toast.duration ?? $$props.duration ?? TOAST_LIFETIME$1), 'duration');
		let pointerStart = null;
		const coords = tag(user_derived(() => $$props.position.split('-')), 'coords');

		const toastsHeightBefore = tag(
			user_derived(() => toastState.heights.reduce(
				(prev, curr, reducerIndex) => {
					if (reducerIndex >= get$1(heightIndex)) return prev;

					return prev + curr.height;
				},
				0
			)),
			'toastsHeightBefore'
		);

		const isDocumentHidden = useDocumentHidden();
		const invert = tag(user_derived(() => $$props.toast.invert || $$props.invert), 'invert');
		const disabled = tag(user_derived(() => strict_equals(get$1(toastType), 'loading')), 'disabled');
		const classes = tag(user_derived(() => ({ ...defaultClasses, ...$$props.classes })), 'classes');
		const toastTitle = tag(user_derived(() => $$props.toast.title), 'toastTitle');
		const toastDescription = tag(user_derived(() => $$props.toast.description), 'toastDescription');
		let closeTimerStartTime = tag(state(0), 'closeTimerStartTime');
		let lastCloseTimerStartTime = tag(state(0), 'lastCloseTimerStartTime');
		const offset = tag(user_derived(() => Math.round(get$1(heightIndex) * GAP$1 + get$1(toastsHeightBefore))), 'offset');

		user_effect(() => {
			get$1(toastTitle);
			get$1(toastDescription);

			let scale;

			if ($$props.expanded || $$props.expandByDefault) {
				scale = 1;
			} else {
				scale = 1 - $$props.index * SCALE_MULTIPLIER;
			}

			const toastEl = untrack(() => get$1(toastRef));

			if (strict_equals(toastEl, undefined)) return;

			toastEl.style.setProperty('height', 'auto');

			const offsetHeight = toastEl.offsetHeight;
			const rectHeight = toastEl.getBoundingClientRect().height;
			const scaledRectHeight = Math.round(rectHeight / scale + Number.EPSILON & 100) / 100;

			toastEl.style.removeProperty('height');

			let finalHeight;

			if (Math.abs(scaledRectHeight - offsetHeight) < 1) {
				// use scaledRectHeight as it's more precise
				finalHeight = scaledRectHeight;
			} else {
				// toast was transitioning its scale, so scaledRectHeight isn't accurate
				finalHeight = offsetHeight;
			}

			set(initialHeight, finalHeight, true);
			toastState.setHeight({ toastId: $$props.toast.id, height: finalHeight });
		});

		function deleteToast() {
			set(removed, true);

			// save the offset for the exit swipe animation
			set(offsetBeforeRemove, get$1(offset), true);

			toastState.removeHeight($$props.toast.id);

			setTimeout(
				() => {
					toastState.remove($$props.toast.id);
				},
				TIME_BEFORE_UNMOUNT
			);
		}

		let timeoutId;
		const isPromiseLoadingOrInfiniteDuration = tag(user_derived(() => $$props.toast.promise && strict_equals(get$1(toastType), 'loading') || strict_equals($$props.toast.duration, Number.POSITIVE_INFINITY)), 'isPromiseLoadingOrInfiniteDuration');

		function startTimer() {
			set(closeTimerStartTime, new Date().getTime(), true);

			// let the toast know it has started
			timeoutId = setTimeout(
				() => {
					$$props.toast.onAutoClose?.($$props.toast);
					deleteToast();
				},
				remainingTime
			);
		}

		function pauseTimer() {
			if (get$1(lastCloseTimerStartTime) < get$1(closeTimerStartTime)) {
				// get the elapsed time since the timer started
				const elapsedTime = new Date().getTime() - get$1(closeTimerStartTime);

				remainingTime = remainingTime - elapsedTime;
			}

			set(lastCloseTimerStartTime, new Date().getTime(), true);
		}

		user_effect(() => {
			if ($$props.toast.updated) {
				// if the toast has been updated after the initial render,
				// we want to reset the timer and set the remaining time to the
				// new duration
				clearTimeout(timeoutId);

				remainingTime = get$1(duration);
				startTimer();
			}
		});

		user_effect(() => {
			if (!get$1(isPromiseLoadingOrInfiniteDuration)) {
				if ($$props.expanded || $$props.interacting || $$props.pauseWhenPageIsHidden && isDocumentHidden.current) {
					pauseTimer();
				} else {
					startTimer();
				}
			}

			return () => clearTimeout(timeoutId);
		});

		onMount(() => {
			set(mounted, true);

			const height = get$1(toastRef)?.getBoundingClientRect().height;

			set(initialHeight, height, true);
			toastState.setHeight({ toastId: $$props.toast.id, height });

			return () => {
				toastState.removeHeight($$props.toast.id);
			};
		});

		user_effect(() => {
			if ($$props.toast.delete) {
				untrack(() => {
					deleteToast();
					$$props.toast.onDismiss?.($$props.toast);
				});
			}
		});

		const handlePointerDown = (event) => {
			if (get$1(disabled)) return;

			set(offsetBeforeRemove, get$1(offset), true);

			const target = event.target;

			// ensure we maintain correct pointer capture even when going outside of the toast (e.g. when swiping)
			target.setPointerCapture(event.pointerId);

			if (strict_equals(target.tagName, 'BUTTON')) return;

			set(swiping, true);
			pointerStart = { x: event.clientX, y: event.clientY };
		};

		const handlePointerUp = () => {
			if (get$1(swipeOut) || !get$1(dismissible)) return;

			pointerStart = null;

			const swipeAmountX = Number(get$1(toastRef)?.style.getPropertyValue('--swipe-amount-x').replace('px', '') || 0);
			const swipeAmountY = Number(get$1(toastRef)?.style.getPropertyValue('--swipe-amount-y').replace('px', '') || 0);
			const timeTaken = new Date().getTime() - (0);
			const swipeAmount = strict_equals(get$1(swipeDirection), 'x') ? swipeAmountX : swipeAmountY;
			const velocity = Math.abs(swipeAmount) / timeTaken;

			// remove only if threshold is met
			if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
				set(offsetBeforeRemove, get$1(offset), true);
				$$props.toast.onDismiss?.($$props.toast);

				if (strict_equals(get$1(swipeDirection), 'x')) {
					set(swipeOutDirection, swipeAmountX > 0 ? 'right' : 'left', true);
				} else {
					set(swipeOutDirection, swipeAmountY > 0 ? 'down' : 'up', true);
				}

				deleteToast();
				set(swipeOut, true);

				return;
			} else {
				get$1(toastRef)?.style.setProperty('--swipe-amount-x', '0px');
				get$1(toastRef)?.style.setProperty('--swipe-amount-y', '0px');
			}

			set(isSwiped, false);
			set(swiping, false);
			set(swipeDirection, null);
		};

		const handlePointerMove = (event) => {
			if (!pointerStart || !get$1(dismissible)) return;

			const isHighlighted = (window.getSelection()?.toString().length ?? -1) > 0;

			if (isHighlighted) return;

			const yDelta = event.clientY - pointerStart.y;
			const xDelta = event.clientX - pointerStart.x;
			const swipeDirections = $$props.swipeDirections ?? getDefaultSwipeDirections($$props.position);

			// Determine swipe direction if not already locked
			if (!get$1(swipeDirection) && (Math.abs(xDelta) > 1 || Math.abs(yDelta) > 1)) {
				set(swipeDirection, Math.abs(xDelta) > Math.abs(yDelta) ? 'x' : 'y', true);
			}

			let swipeAmount = { x: 0, y: 0 };

			if (strict_equals(get$1(swipeDirection), 'y')) {
				// handle vertical swipes
				if (swipeDirections.includes('top') || swipeDirections.includes('bottom')) {
					if (swipeDirections.includes('top') && yDelta < 0 || swipeDirections.includes('bottom') && yDelta > 0) {
						swipeAmount.y = yDelta;
					} else {
						// smoothly transition to dampened movement
						const dampenedDelta = yDelta * getDampening(yDelta);

						// ensure we don't jump when transition to dampened movement
						swipeAmount.y = Math.abs(dampenedDelta) < Math.abs(yDelta) ? dampenedDelta : yDelta;
					}
				}
			} else if (strict_equals(get$1(swipeDirection), 'x')) {
				// handle horizontal swipes
				if (swipeDirections.includes('left') || swipeDirections.includes('right')) {
					if (swipeDirections.includes('left') && xDelta < 0 || swipeDirections.includes('right') && xDelta > 0) {
						swipeAmount.x = xDelta;
					} else {
						// Smoothly transition to dampened movement
						const dampenedDelta = xDelta * getDampening(xDelta);

						// Ensure we don't jump when transitioning to dampened movement
						swipeAmount.x = Math.abs(dampenedDelta) < Math.abs(xDelta) ? dampenedDelta : xDelta;
					}
				}
			}

			if (Math.abs(swipeAmount.x) > 0 || Math.abs(swipeAmount.y) > 0) {
				set(isSwiped, true);
			}

			get$1(toastRef)?.style.setProperty('--swipe-amount-x', `${swipeAmount.x}px`);
			get$1(toastRef)?.style.setProperty('--swipe-amount-y', `${swipeAmount.y}px`);
		};

		const handleDragEnd = () => {
			set(swiping, false);
			set(swipeDirection, null);
			pointerStart = null;
		};

		const icon = tag(
			user_derived(() => {
				if ($$props.toast.icon) return $$props.toast.icon;
				if (strict_equals(get$1(toastType), 'success')) return $$props.successIcon;
				if (strict_equals(get$1(toastType), 'error')) return $$props.errorIcon;
				if (strict_equals(get$1(toastType), 'warning')) return $$props.warningIcon;
				if (strict_equals(get$1(toastType), 'info')) return $$props.infoIcon;
				if (strict_equals(get$1(toastType), 'loading')) return $$props.loadingIcon;

				return null;
			}),
			'icon'
		);

		var $$exports = { ...legacy_api() };
		var li = root$a();

		set_attribute(li, 'tabindex', 0);

		let styles;
		var node_2 = child(li);

		{
			var consequent_1 = ($$anchor) => {
				var button = root_4$3();
				var node_3 = child(button);

				add_svelte_meta(() => snippet(node_3, () => $$props.closeIcon ?? noop$1), 'render', Toast, 388, 3);

				template_effect(
					($0) => {
						set_attribute(button, 'aria-label', $$props.closeButtonAriaLabel);
						set_attribute(button, 'data-disabled', get$1(disabled));
						set_class(button, 1, $0);
					},
					[
						() => clsx(cn(get$1(classes)?.closeButton, $$props.toast?.classes?.closeButton))
					]
				);

				delegated('click', button, function click() {
					if (get$1(disabled) || !get$1(dismissible)) return;

					deleteToast();
					$$props.toast.onDismiss?.($$props.toast);
				});

				append($$anchor, button);
			};

			add_svelte_meta(
				() => if_block(node_2, ($$render) => {
					if (get$1(closeButton) && !$$props.toast.component && strict_equals(get$1(toastType), 'loading', false) && strict_equals($$props.closeIcon, null, false)) $$render(consequent_1);
				}),
				'if',
				Toast,
				376,
				1
			);
		}

		var node_4 = sibling(node_2, 2);

		{
			var consequent_2 = ($$anchor) => {
				const Component = tag(user_derived(() => $$props.toast.component), 'Component');

				get$1(Component);

				var fragment_2 = comment();
				var node_5 = first_child(fragment_2);

				add_svelte_meta(
					() => component(node_5, () => get$1(Component), ($$anchor, Component_1) => {
						Component_1($$anchor, spread_props(() => $$props.toast.componentProps, { closeToast: deleteToast }));
					}),
					'component',
					Toast,
					394,
					2,
					{ componentTag: 'Component' }
				);

				append($$anchor, fragment_2);
			};

			var alternate_4 = ($$anchor) => {
				var fragment_3 = root_6$2();
				var node_6 = first_child(fragment_3);

				{
					var consequent_11 = ($$anchor) => {
						var div_1 = root_7$2();
						var node_7 = child(div_1);

						{
							var consequent_4 = ($$anchor) => {
								var fragment_4 = comment();
								var node_8 = first_child(fragment_4);

								{
									var consequent_3 = ($$anchor) => {
										var fragment_5 = comment();
										var node_9 = first_child(fragment_5);

										add_svelte_meta(
											() => component(node_9, () => $$props.toast.icon, ($$anchor, toast_icon) => {
												toast_icon($$anchor, {});
											}),
											'component',
											Toast,
											400,
											6,
											{ componentTag: 'toast.icon' }
										);

										append($$anchor, fragment_5);
									};

									var alternate_1 = ($$anchor) => {
										add_svelte_meta(() => LoadingIcon($$anchor), 'render', Toast, 402, 6);
									};

									add_svelte_meta(
										() => if_block(node_8, ($$render) => {
											if ($$props.toast.icon) $$render(consequent_3); else $$render(alternate_1, -1);
										}),
										'if',
										Toast,
										399,
										5
									);
								}

								append($$anchor, fragment_4);
							};

							add_svelte_meta(
								() => if_block(node_7, ($$render) => {
									if ($$props.toast.promise || strict_equals(get$1(toastType), 'loading')) $$render(consequent_4);
								}),
								'if',
								Toast,
								398,
								4
							);
						}

						var node_10 = sibling(node_7, 2);

						{
							var consequent_10 = ($$anchor) => {
								var fragment_7 = comment();
								var node_11 = first_child(fragment_7);

								{
									var consequent_5 = ($$anchor) => {
										var fragment_8 = comment();
										var node_12 = first_child(fragment_8);

										add_svelte_meta(
											() => component(node_12, () => $$props.toast.icon, ($$anchor, toast_icon_1) => {
												toast_icon_1($$anchor, {});
											}),
											'component',
											Toast,
											407,
											6,
											{ componentTag: 'toast.icon' }
										);

										append($$anchor, fragment_8);
									};

									var consequent_6 = ($$anchor) => {
										var fragment_9 = comment();
										var node_13 = first_child(fragment_9);

										add_svelte_meta(() => snippet(node_13, () => $$props.successIcon ?? noop$1), 'render', Toast, 409, 6);
										append($$anchor, fragment_9);
									};

									var consequent_7 = ($$anchor) => {
										var fragment_10 = comment();
										var node_14 = first_child(fragment_10);

										add_svelte_meta(() => snippet(node_14, () => $$props.errorIcon ?? noop$1), 'render', Toast, 411, 6);
										append($$anchor, fragment_10);
									};

									var consequent_8 = ($$anchor) => {
										var fragment_11 = comment();
										var node_15 = first_child(fragment_11);

										add_svelte_meta(() => snippet(node_15, () => $$props.warningIcon ?? noop$1), 'render', Toast, 413, 6);
										append($$anchor, fragment_11);
									};

									var consequent_9 = ($$anchor) => {
										var fragment_12 = comment();
										var node_16 = first_child(fragment_12);

										add_svelte_meta(() => snippet(node_16, () => $$props.infoIcon ?? noop$1), 'render', Toast, 415, 6);
										append($$anchor, fragment_12);
									};

									add_svelte_meta(
										() => if_block(node_11, ($$render) => {
											if ($$props.toast.icon) $$render(consequent_5); else if (strict_equals(get$1(toastType), 'success')) $$render(consequent_6, 1); else if (strict_equals(get$1(toastType), 'error')) $$render(consequent_7, 2); else if (strict_equals(get$1(toastType), 'warning')) $$render(consequent_8, 3); else if (strict_equals(get$1(toastType), 'info')) $$render(consequent_9, 4);
										}),
										'if',
										Toast,
										406,
										5
									);
								}

								append($$anchor, fragment_7);
							};

							add_svelte_meta(
								() => if_block(node_10, ($$render) => {
									if (strict_equals($$props.toast.type, 'loading', false)) $$render(consequent_10);
								}),
								'if',
								Toast,
								405,
								4
							);
						}

						template_effect(($0) => set_class(div_1, 1, $0), [
							() => clsx(cn(get$1(classes)?.icon, $$props.toast?.classes?.icon))
						]);

						append($$anchor, div_1);
					};

					add_svelte_meta(
						() => if_block(node_6, ($$render) => {
							if ((get$1(toastType) || $$props.toast.icon || $$props.toast.promise) && strict_equals($$props.toast.icon, null, false) && (strict_equals(get$1(icon), null, false) || $$props.toast.icon)) $$render(consequent_11);
						}),
						'if',
						Toast,
						396,
						2
					);
				}

				var div_2 = sibling(node_6, 2);
				var div_3 = child(div_2);
				var node_17 = child(div_3);

				{
					var consequent_13 = ($$anchor) => {
						var fragment_13 = comment();
						var node_18 = first_child(fragment_13);

						{
							var consequent_12 = ($$anchor) => {
								const Title = tag(user_derived(() => $$props.toast.title), 'Title');

								get$1(Title);

								var fragment_14 = comment();
								var node_19 = first_child(fragment_14);

								add_svelte_meta(
									() => component(node_19, () => get$1(Title), ($$anchor, Title_1) => {
										Title_1($$anchor, spread_props(() => $$props.toast.componentProps));
									}),
									'component',
									Toast,
									428,
									6,
									{ componentTag: 'Title' }
								);

								append($$anchor, fragment_14);
							};

							var alternate_2 = ($$anchor) => {
								var text$1 = text();

								template_effect(() => set_text(text$1, $$props.toast.title));
								append($$anchor, text$1);
							};

							add_svelte_meta(
								() => if_block(node_18, ($$render) => {
									if (strict_equals(typeof $$props.toast.title, 'string', false)) $$render(consequent_12); else $$render(alternate_2, -1);
								}),
								'if',
								Toast,
								426,
								5
							);
						}

						append($$anchor, fragment_13);
					};

					add_svelte_meta(
						() => if_block(node_17, ($$render) => {
							if ($$props.toast.title) $$render(consequent_13);
						}),
						'if',
						Toast,
						425,
						4
					);
				}

				var node_20 = sibling(div_3, 2);

				{
					var consequent_15 = ($$anchor) => {
						var div_4 = root_20$2();
						var node_21 = child(div_4);

						{
							var consequent_14 = ($$anchor) => {
								const Description = tag(user_derived(() => $$props.toast.description), 'Description');

								get$1(Description);

								var fragment_16 = comment();
								var node_22 = first_child(fragment_16);

								add_svelte_meta(
									() => component(node_22, () => get$1(Description), ($$anchor, Description_1) => {
										Description_1($$anchor, spread_props(() => $$props.toast.componentProps));
									}),
									'component',
									Toast,
									446,
									6,
									{ componentTag: 'Description' }
								);

								append($$anchor, fragment_16);
							};

							var alternate_3 = ($$anchor) => {
								var text_1 = text();

								template_effect(() => set_text(text_1, $$props.toast.description));
								append($$anchor, text_1);
							};

							add_svelte_meta(
								() => if_block(node_21, ($$render) => {
									if (strict_equals(typeof $$props.toast.description, 'string', false)) $$render(consequent_14); else $$render(alternate_3, -1);
								}),
								'if',
								Toast,
								444,
								5
							);
						}

						template_effect(($0) => set_class(div_4, 1, $0), [
							() => clsx(cn(descriptionClass(), get$1(toastDescriptionClass), get$1(classes)?.description, $$props.toast.classes?.description))
						]);

						append($$anchor, div_4);
					};

					add_svelte_meta(
						() => if_block(node_20, ($$render) => {
							if ($$props.toast.description) $$render(consequent_15);
						}),
						'if',
						Toast,
						434,
						3
					);
				}

				var node_23 = sibling(div_2, 2);

				{
					var consequent_18 = ($$anchor) => {
						var fragment_18 = comment();
						var node_24 = first_child(fragment_18);

						{
							var consequent_16 = ($$anchor) => {
								var fragment_19 = comment();
								var node_25 = first_child(fragment_19);

								add_svelte_meta(
									() => component(node_25, () => $$props.toast.cancel, ($$anchor, toast_cancel) => {
										toast_cancel($$anchor, {});
									}),
									'component',
									Toast,
									455,
									4,
									{ componentTag: 'toast.cancel' }
								);

								append($$anchor, fragment_19);
							};

							var consequent_17 = ($$anchor) => {
								var button_1 = root_25$2();
								var text_2 = child(button_1);

								template_effect(
									($0) => {
										set_style(button_1, $$props.toast.cancelButtonStyle ?? cancelButtonStyle());
										set_class(button_1, 1, $0);
										set_text(text_2, $$props.toast.cancel.label);
									},
									[
										() => clsx(cn(get$1(classes)?.cancelButton, $$props.toast?.classes?.cancelButton))
									]
								);

								delegated('click', button_1, function click_1(event) {
									if (!isAction($$props.toast.cancel)) return;
									if (!get$1(dismissible)) return;

									$$props.toast.cancel?.onClick?.(event);
									deleteToast();
								});

								append($$anchor, button_1);
							};

							var d = user_derived(() => isAction($$props.toast.cancel));

							add_svelte_meta(
								() => if_block(node_24, ($$render) => {
									if (strict_equals(typeof $$props.toast.cancel, 'function')) $$render(consequent_16); else if (get$1(d)) $$render(consequent_17, 1);
								}),
								'if',
								Toast,
								454,
								3
							);
						}

						append($$anchor, fragment_18);
					};

					add_svelte_meta(
						() => if_block(node_23, ($$render) => {
							if ($$props.toast.cancel) $$render(consequent_18);
						}),
						'if',
						Toast,
						453,
						2
					);
				}

				var node_26 = sibling(node_23, 2);

				{
					var consequent_21 = ($$anchor) => {
						var fragment_20 = comment();
						var node_27 = first_child(fragment_20);

						{
							var consequent_19 = ($$anchor) => {
								var fragment_21 = comment();
								var node_28 = first_child(fragment_21);

								add_svelte_meta(
									() => component(node_28, () => $$props.toast.action, ($$anchor, toast_action) => {
										toast_action($$anchor, {});
									}),
									'component',
									Toast,
									478,
									4,
									{ componentTag: 'toast.action' }
								);

								append($$anchor, fragment_21);
							};

							var consequent_20 = ($$anchor) => {
								var button_2 = root_28$2();
								var text_3 = child(button_2);

								template_effect(
									($0) => {
										set_style(button_2, $$props.toast.actionButtonStyle ?? actionButtonStyle());
										set_class(button_2, 1, $0);
										set_text(text_3, $$props.toast.action.label);
									},
									[
										() => clsx(cn(get$1(classes)?.actionButton, $$props.toast?.classes?.actionButton))
									]
								);

								delegated('click', button_2, function click_2(event) {
									if (!isAction($$props.toast.action)) return;

									$$props.toast.action?.onClick(event);

									if (event.defaultPrevented) return;

									deleteToast();
								});

								append($$anchor, button_2);
							};

							var d_1 = user_derived(() => isAction($$props.toast.action));

							add_svelte_meta(
								() => if_block(node_27, ($$render) => {
									if (strict_equals(typeof $$props.toast.action, 'function')) $$render(consequent_19); else if (get$1(d_1)) $$render(consequent_20, 1);
								}),
								'if',
								Toast,
								477,
								3
							);
						}

						append($$anchor, fragment_20);
					};

					add_svelte_meta(
						() => if_block(node_26, ($$render) => {
							if ($$props.toast.action) $$render(consequent_21);
						}),
						'if',
						Toast,
						476,
						2
					);
				}

				template_effect(
					($0, $1) => {
						set_class(div_2, 1, $0);
						set_class(div_3, 1, $1);
					},
					[
						() => clsx(cn(get$1(classes)?.content, $$props.toast?.classes?.content)),
						() => clsx(cn(get$1(classes)?.title, $$props.toast?.classes?.title))
					]
				);

				append($$anchor, fragment_3);
			};

			add_svelte_meta(
				() => if_block(node_4, ($$render) => {
					if ($$props.toast.component) $$render(consequent_2); else $$render(alternate_4, -1);
				}),
				'if',
				Toast,
				392,
				1
			);
		}
		bind_this(li, ($$value) => set(toastRef, $$value), () => get$1(toastRef));

		template_effect(
			($0, $1, $2) => {
				set_class(li, 1, $0);
				set_attribute(li, 'aria-live', $$props.toast.important ? 'assertive' : 'polite');
				set_attribute(li, 'data-rich-colors', $$props.toast.richColors ?? defaultRichColors());
				set_attribute(li, 'data-styled', !($$props.toast.component || $$props.toast.unstyled || unstyled()));
				set_attribute(li, 'data-mounted', get$1(mounted));
				set_attribute(li, 'data-promise', $1);
				set_attribute(li, 'data-swiped', get$1(isSwiped));
				set_attribute(li, 'data-removed', get$1(removed));
				set_attribute(li, 'data-visible', get$1(isVisible));
				set_attribute(li, 'data-y-position', get$1(coords)[0]);
				set_attribute(li, 'data-x-position', get$1(coords)[1]);
				set_attribute(li, 'data-index', $$props.index);
				set_attribute(li, 'data-front', get$1(isFront));
				set_attribute(li, 'data-swiping', get$1(swiping));
				set_attribute(li, 'data-dismissible', get$1(dismissible));
				set_attribute(li, 'data-type', get$1(toastType));
				set_attribute(li, 'data-invert', get$1(invert));
				set_attribute(li, 'data-swipe-out', get$1(swipeOut));
				set_attribute(li, 'data-swipe-direction', get$1(swipeOutDirection));
				set_attribute(li, 'data-expanded', $2);

				styles = set_style(li, `${$$props.style} ${$$props.toast.style}`, styles, {
					'--index': $$props.index,
					'--toasts-before': $$props.index,
					'--z-index': toastState.toasts.length - $$props.index,
					'--offset': `${get$1(removed) ? get$1(offsetBeforeRemove) : get$1(offset)}px`,
					'--initial-height': $$props.expandByDefault ? 'auto' : `${get$1(initialHeight)}px`
				});
			},
			[
				() => clsx(cn($$props.class, get$1(toastClass), get$1(classes)?.toast, $$props.toast?.classes?.toast, get$1(classes)?.[get$1(toastType)], $$props.toast?.classes?.[get$1(toastType)])),
				() => Boolean($$props.toast.promise),
				() => Boolean($$props.expanded || $$props.expandByDefault && get$1(mounted))
			]
		);

		delegated('pointermove', li, handlePointerMove);
		delegated('pointerup', li, handlePointerUp);
		delegated('pointerdown', li, handlePointerDown);
		event('dragend', li, handleDragEnd);
		append($$anchor, li);

		return pop($$exports);
	}

	delegate(['pointermove', 'pointerup', 'pointerdown', 'click']);

	SuccessIcon[FILENAME] = 'node_modules/svelte-sonner/dist/icons/SuccessIcon.svelte';

	var root$9 = add_locations(from_svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" data-sonner-success-icon=""><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"></path></svg>`), SuccessIcon[FILENAME], [[1, 0, [[9, 1]]]]);

	function SuccessIcon($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var svg = root$9();

		append($$anchor, svg);

		return pop($$exports);
	}

	ErrorIcon[FILENAME] = 'node_modules/svelte-sonner/dist/icons/ErrorIcon.svelte';

	var root$8 = add_locations(from_svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" data-sonner-error-icon=""><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path></svg>`), ErrorIcon[FILENAME], [[1, 0, [[9, 1]]]]);

	function ErrorIcon($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var svg = root$8();

		append($$anchor, svg);

		return pop($$exports);
	}

	WarningIcon[FILENAME] = 'node_modules/svelte-sonner/dist/icons/WarningIcon.svelte';

	var root$7 = add_locations(from_svg(`<svg viewBox="0 0 64 64" fill="currentColor" height="20" width="20" data-sonner-warning-icon="" xmlns="http://www.w3.org/2000/svg"><path d="M32.427,7.987c2.183,0.124 4,1.165 5.096,3.281l17.936,36.208c1.739,3.66 -0.954,8.585 -5.373,8.656l-36.119,0c-4.022,-0.064 -7.322,-4.631 -5.352,-8.696l18.271,-36.207c0.342,-0.65 0.498,-0.838 0.793,-1.179c1.186,-1.375 2.483,-2.111 4.748,-2.063Zm-0.295,3.997c-0.687,0.034 -1.316,0.419 -1.659,1.017c-6.312,11.979 -12.397,24.081 -18.301,36.267c-0.546,1.225 0.391,2.797 1.762,2.863c12.06,0.195 24.125,0.195 36.185,0c1.325,-0.064 2.321,-1.584 1.769,-2.85c-5.793,-12.184 -11.765,-24.286 -17.966,-36.267c-0.366,-0.651 -0.903,-1.042 -1.79,-1.03Z"></path><path d="M33.631,40.581l-3.348,0l-0.368,-16.449l4.1,0l-0.384,16.449Zm-3.828,5.03c0,-0.609 0.197,-1.113 0.592,-1.514c0.396,-0.4 0.935,-0.601 1.618,-0.601c0.684,0 1.223,0.201 1.618,0.601c0.395,0.401 0.593,0.905 0.593,1.514c0,0.587 -0.193,1.078 -0.577,1.473c-0.385,0.395 -0.929,0.593 -1.634,0.593c-0.705,0 -1.249,-0.198 -1.634,-0.593c-0.384,-0.395 -0.576,-0.886 -0.576,-1.473Z"></path></svg>`), WarningIcon[FILENAME], [[1, 0, [[9, 1], [12, 1]]]]);

	function WarningIcon($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var svg = root$7();

		append($$anchor, svg);

		return pop($$exports);
	}

	InfoIcon[FILENAME] = 'node_modules/svelte-sonner/dist/icons/InfoIcon.svelte';

	var root$6 = add_locations(from_svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" data-sonner-info-icon=""><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd"></path></svg>`), InfoIcon[FILENAME], [[1, 0, [[9, 1]]]]);

	function InfoIcon($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var svg = root$6();

		append($$anchor, svg);

		return pop($$exports);
	}

	CloseIcon[FILENAME] = 'node_modules/svelte-sonner/dist/icons/CloseIcon.svelte';

	var root$5 = add_locations(from_svg(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-sonner-close-icon=""><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`), CloseIcon[FILENAME], [[1, 0, [[13, 1], [14, 1]]]]);

	function CloseIcon($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var svg = root$5();

		append($$anchor, svg);

		return pop($$exports);
	}

	Toaster[FILENAME] = 'node_modules/svelte-sonner/dist/Toaster.svelte';

	const VISIBLE_TOASTS_AMOUNT = 3;
	const VIEWPORT_OFFSET = '24px';
	const MOBILE_VIEWPORT_OFFSET = '16px';
	const TOAST_LIFETIME = 4000;
	const TOAST_WIDTH = 356;
	const GAP = 14;
	const DARK = 'dark';
	const LIGHT = 'light';

	function getOffsetObject(defaultOffset, mobileOffset) {
		const styles = {};

		[defaultOffset, mobileOffset].forEach((offset, index) => {
			const isMobile = strict_equals(index, 1);
			const prefix = isMobile ? '--mobile-offset' : '--offset';
			const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;

			function assignAll(offset) {
				['top', 'right', 'bottom', 'left'].forEach((key) => {
					styles[`${prefix}-${key}`] = strict_equals(typeof offset, 'number') ? `${offset}px` : offset;
				});
			}

			if (strict_equals(typeof offset, 'number') || strict_equals(typeof offset, 'string')) {
				assignAll(offset);
			} else if (strict_equals(typeof offset, 'object')) {
				['top', 'right', 'bottom', 'left'].forEach((key) => {
					const value = offset[key];

					if (strict_equals(value, undefined)) {
						styles[`${prefix}-${key}`] = defaultValue;
					} else {
						styles[`${prefix}-${key}`] = strict_equals(typeof value, 'number') ? `${value}px` : value;
					}
				});
			} else {
				assignAll(defaultValue);
			}
		});

		return styles;
	}

	var root_2$3 = add_locations(from_html(`<ol></ol>`), Toaster[FILENAME], [[252, 3]]);
	var root$4 = add_locations(from_html(`<section aria-live="polite" aria-relevant="additions text" aria-atomic="false" class="svelte-nbs0zk"><!></section>`), Toaster[FILENAME], [[239, 0]]);

	function Toaster($$anchor, $$props) {
		check_target(new.target);
		push($$props, true);

		function getInitialTheme(t) {
			if (strict_equals(t, 'system', false)) return t;

			if (strict_equals(typeof window, 'undefined', false)) {
				if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
					return DARK;
				}

				return LIGHT;
			}

			return LIGHT;
		}

		let invert = prop($$props, 'invert', 3, false),
			position = prop($$props, 'position', 3, 'bottom-right'),
			hotkey = prop($$props, 'hotkey', 19, () => ['altKey', 'KeyT']),
			expand = prop($$props, 'expand', 3, false),
			closeButton = prop($$props, 'closeButton', 3, false),
			offset = prop($$props, 'offset', 3, VIEWPORT_OFFSET),
			mobileOffset = prop($$props, 'mobileOffset', 3, MOBILE_VIEWPORT_OFFSET),
			theme = prop($$props, 'theme', 3, 'light'),
			richColors = prop($$props, 'richColors', 3, false),
			duration = prop($$props, 'duration', 3, TOAST_LIFETIME),
			visibleToasts = prop($$props, 'visibleToasts', 3, VISIBLE_TOASTS_AMOUNT),
			toastOptions = prop($$props, 'toastOptions', 19, () => ({})),
			dir = prop($$props, 'dir', 7, 'auto'),
			gap = prop($$props, 'gap', 3, GAP),
			pauseWhenPageIsHidden = prop($$props, 'pauseWhenPageIsHidden', 3, false),
			containerAriaLabel = prop($$props, 'containerAriaLabel', 3, 'Notifications'),
			closeButtonAriaLabel = prop($$props, 'closeButtonAriaLabel', 3, 'Close toast'),
			restProps = rest_props(
				$$props,
				[
					'$$slots',
					'$$events',
					'$$legacy',
					'invert',
					'position',
					'hotkey',
					'expand',
					'closeButton',
					'offset',
					'mobileOffset',
					'theme',
					'richColors',
					'duration',
					'visibleToasts',
					'toastOptions',
					'dir',
					'gap',
					'pauseWhenPageIsHidden',
					'loadingIcon',
					'successIcon',
					'errorIcon',
					'warningIcon',
					'closeIcon',
					'infoIcon',
					'containerAriaLabel',
					'class',
					'closeButtonAriaLabel',
					'onblur',
					'onfocus',
					'onmouseenter',
					'onmousemove',
					'onmouseleave',
					'ondragend',
					'onpointerdown',
					'onpointerup'
				]);

		function getDocumentDirection() {
			if (strict_equals(dir(), 'auto', false)) return dir();
			if (strict_equals(typeof window, 'undefined')) return 'ltr';
			if (strict_equals(typeof document, 'undefined')) return 'ltr'; // For Fresh purpose

			const dirAttribute = document.documentElement.getAttribute('dir');

			if (strict_equals(dirAttribute, 'auto') || !dirAttribute) {
				untrack(() => dir(window.getComputedStyle(document.documentElement).direction ?? 'ltr'));

				return dir();
			}

			untrack(() => dir(dirAttribute));

			return dirAttribute;
		}

		const possiblePositions = tag(
			user_derived(() => Array.from(new Set([
				position(),
				...toastState.toasts.filter((toast) => toast.position).map((toast) => toast.position)
			].filter(Boolean)))),
			'possiblePositions'
		);

		let expanded = tag(state(false), 'expanded');
		let interacting = tag(state(false), 'interacting');
		let actualTheme = tag(state(proxy(getInitialTheme(theme()))), 'actualTheme');
		let listRef = tag(state(void 0), 'listRef');
		let lastFocusedElementRef = tag(state(null), 'lastFocusedElementRef');
		let isFocusWithin = tag(state(false), 'isFocusWithin');
		const hotkeyLabel = tag(user_derived(() => hotkey().join('+').replace(/Key/g, '').replace(/Digit/g, '')), 'hotkeyLabel');

		user_effect(() => {
			if (toastState.toasts.length <= 1) {
				set(expanded, false);
			}
		});

		// Check for dismissed toasts and remove them. We need to do this to have dismiss animation.
		user_effect(() => {
			const toastsToDismiss = toastState.toasts.filter((toast) => toast.dismiss && !toast.delete);

			if (toastsToDismiss.length > 0) {
				const updatedToasts = toastState.toasts.map((toast) => {
					const matchingToast = toastsToDismiss.find((dismissToast) => strict_equals(dismissToast.id, toast.id));

					if (matchingToast) {
						return { ...toast, delete: true };
					}

					return toast;
				});

				toastState.toasts = updatedToasts;
			}
		});

		user_effect(() => {
			return () => {
				if (get$1(listRef) && get$1(lastFocusedElementRef)) {
					get$1(lastFocusedElementRef).focus({ preventScroll: true });
					set(lastFocusedElementRef, null);
					set(isFocusWithin, false);
				}
			};
		});

		onMount(() => {
			toastState.reset();

			const handleKeydown = (event) => {
				const isHotkeyPressed = hotkey().every((key

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				) => event[key] || strict_equals(event.code, key));

				if (isHotkeyPressed) {
					set(expanded, true);
					get$1(listRef)?.focus();
				}

				if (strict_equals(event.code, 'Escape') && (strict_equals(document.activeElement, get$1(listRef)) || get$1(listRef)?.contains(document.activeElement))) {
					set(expanded, false);
				}
			};

			return on(document, 'keydown', handleKeydown);
		});

		user_effect(() => {
			if (strict_equals(theme(), 'system', false)) {
				set(actualTheme, theme());
			}

			if (strict_equals(typeof window, 'undefined', false)) {
				if (strict_equals(theme(), 'system')) {
					if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
						set(actualTheme, DARK);
					} else {
						set(actualTheme, LIGHT);
					}
				}

				const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

				const changeHandler = ({ matches }) => {
					if (strict_equals(theme(), 'system', false)) return;

					set(actualTheme, matches ? DARK : LIGHT, true);
				};

				if ('addEventListener' in mediaQueryList) {
					mediaQueryList.addEventListener('change', changeHandler);
				} else {
					// @ts-expect-error deprecated API
					mediaQueryList.addListener(changeHandler);
				}
			}
		});

		const handleBlur = (event) => {
			$$props.onblur?.(event);

			if (get$1(isFocusWithin) && !event.currentTarget.contains(event.relatedTarget)) {
				set(isFocusWithin, false);

				if (get$1(lastFocusedElementRef)) {
					get$1(lastFocusedElementRef).focus({ preventScroll: true });
					set(lastFocusedElementRef, null);
				}
			}
		};

		const handleFocus = (event) => {
			$$props.onfocus?.(event);

			const isNotDismissable = event.target instanceof HTMLElement && strict_equals(event.target.dataset.dismissible, 'false');

			if (isNotDismissable) return;

			if (!get$1(isFocusWithin)) {
				set(isFocusWithin, true);
				set(lastFocusedElementRef, event.relatedTarget, true);
			}
		};

		const handlePointerDown = (event) => {
			$$props.onpointerdown?.(event);

			const isNotDismissable = event.target instanceof HTMLElement && strict_equals(event.target.dataset.dismissible, 'false');

			if (isNotDismissable) return;

			set(interacting, true);
		};

		const handleMouseEnter = (event) => {
			$$props.onmouseenter?.(event);
			set(expanded, true);
		};

		const handleMouseLeave = (event) => {
			$$props.onmouseleave?.(event);

			if (!get$1(interacting)) {
				set(expanded, false);
			}
		};

		const handleMouseMove = (event) => {
			$$props.onmousemove?.(event);
			set(expanded, true);
		};

		const handleDragEnd = (event) => {
			$$props.ondragend?.(event);
			set(expanded, false);
		};

		const handlePointerUp = (event) => {
			$$props.onpointerup?.(event);
			set(interacting, false);
		};

		sonnerContext.set(new SonnerState());

		var $$exports = { ...legacy_api() };
		var section = root$4();

		set_attribute(section, 'tabindex', -1);

		var node = child(section);

		{
			var consequent_10 = ($$anchor) => {
				var fragment = comment();
				var node_1 = first_child(fragment);

				add_svelte_meta(
					() => each(node_1, 18, () => get$1(possiblePositions), (position) => position, ($$anchor, position, index, $$array) => {
						const computed_const = tag(
							user_derived(() => {
								const [y, x] = position.split('-');

								return { y, x };
							}),
							'[@const]'
						);

						get$1(computed_const);

						const offsetObject = tag(user_derived(() => getOffsetObject(offset(), mobileOffset())), 'offsetObject');

						get$1(offsetObject);

						var ol = root_2$3();

						attribute_effect(
							ol,
							($0) => ({
								tabindex: -1,
								dir: $0,
								class: $$props.class,
								'data-sonner-toaster': true,
								'data-sonner-theme': get$1(actualTheme),
								'data-y-position': get$1(computed_const).y,
								'data-x-position': get$1(computed_const).x,
								style: $$props.style,
								onblur: handleBlur,
								onfocus: handleFocus,
								onmouseenter: handleMouseEnter,
								onmousemove: handleMouseMove,
								onmouseleave: handleMouseLeave,
								ondragend: handleDragEnd,
								onpointerdown: handlePointerDown,
								onpointerup: handlePointerUp,
								...restProps,
								[STYLE]: {
									'--front-toast-height': `${toastState.heights[0]?.height}px`,
									'--width': `${TOAST_WIDTH}px`,
									'--gap': `${gap()}px`,
									'--offset-top': get$1(offsetObject)['--offset-top'],
									'--offset-right': get$1(offsetObject)['--offset-right'],
									'--offset-bottom': get$1(offsetObject)['--offset-bottom'],
									'--offset-left': get$1(offsetObject)['--offset-left'],
									'--mobile-offset-top': get$1(offsetObject)['--mobile-offset-top'],
									'--mobile-offset-right': get$1(offsetObject)['--mobile-offset-right'],
									'--mobile-offset-bottom': get$1(offsetObject)['--mobile-offset-bottom'],
									'--mobile-offset-left': get$1(offsetObject)['--mobile-offset-left']
								}
							}),
							[getDocumentDirection],
							void 0,
							void 0,
							'svelte-nbs0zk'
						);

						add_svelte_meta(
							() => each(ol, 23, () => toastState.toasts.filter((toast) => !toast.position && strict_equals(get$1(index), 0) || strict_equals(toast.position, position)), (toast) => toast.id, ($$anchor, toast, index, $$array_1) => {
								{
									const successIcon = wrap_snippet(Toaster, function ($$anchor) {
										validate_snippet_args(...arguments);

										var fragment_2 = comment();
										var node_2 = first_child(fragment_2);

										{
											var consequent = ($$anchor) => {
												var fragment_3 = comment();
												var node_3 = first_child(fragment_3);

												add_svelte_meta(() => snippet(node_3, () => $$props.successIcon ?? noop$1), 'render', Toaster, 318, 8);
												append($$anchor, fragment_3);
											};

											var consequent_1 = ($$anchor) => {
												add_svelte_meta(() => SuccessIcon($$anchor, {}), 'component', Toaster, 320, 8, { componentTag: 'SuccessIcon' });
											};

											add_svelte_meta(
												() => if_block(node_2, ($$render) => {
													if ($$props.successIcon) $$render(consequent); else if (strict_equals($$props.successIcon, null, false)) $$render(consequent_1, 1);
												}),
												'if',
												Toaster,
												317,
												7
											);
										}

										append($$anchor, fragment_2);
									});

									const errorIcon = wrap_snippet(Toaster, function ($$anchor) {
										validate_snippet_args(...arguments);

										var fragment_5 = comment();
										var node_4 = first_child(fragment_5);

										{
											var consequent_2 = ($$anchor) => {
												var fragment_6 = comment();
												var node_5 = first_child(fragment_6);

												add_svelte_meta(() => snippet(node_5, () => $$props.errorIcon ?? noop$1), 'render', Toaster, 326, 8);
												append($$anchor, fragment_6);
											};

											var consequent_3 = ($$anchor) => {
												add_svelte_meta(() => ErrorIcon($$anchor, {}), 'component', Toaster, 328, 8, { componentTag: 'ErrorIcon' });
											};

											add_svelte_meta(
												() => if_block(node_4, ($$render) => {
													if ($$props.errorIcon) $$render(consequent_2); else if (strict_equals($$props.errorIcon, null, false)) $$render(consequent_3, 1);
												}),
												'if',
												Toaster,
												325,
												7
											);
										}

										append($$anchor, fragment_5);
									});

									const warningIcon = wrap_snippet(Toaster, function ($$anchor) {
										validate_snippet_args(...arguments);

										var fragment_8 = comment();
										var node_6 = first_child(fragment_8);

										{
											var consequent_4 = ($$anchor) => {
												var fragment_9 = comment();
												var node_7 = first_child(fragment_9);

												add_svelte_meta(() => snippet(node_7, () => $$props.warningIcon ?? noop$1), 'render', Toaster, 334, 8);
												append($$anchor, fragment_9);
											};

											var consequent_5 = ($$anchor) => {
												add_svelte_meta(() => WarningIcon($$anchor, {}), 'component', Toaster, 336, 8, { componentTag: 'WarningIcon' });
											};

											add_svelte_meta(
												() => if_block(node_6, ($$render) => {
													if ($$props.warningIcon) $$render(consequent_4); else if (strict_equals($$props.warningIcon, null, false)) $$render(consequent_5, 1);
												}),
												'if',
												Toaster,
												333,
												7
											);
										}

										append($$anchor, fragment_8);
									});

									const infoIcon = wrap_snippet(Toaster, function ($$anchor) {
										validate_snippet_args(...arguments);

										var fragment_11 = comment();
										var node_8 = first_child(fragment_11);

										{
											var consequent_6 = ($$anchor) => {
												var fragment_12 = comment();
												var node_9 = first_child(fragment_12);

												add_svelte_meta(() => snippet(node_9, () => $$props.infoIcon ?? noop$1), 'render', Toaster, 342, 8);
												append($$anchor, fragment_12);
											};

											var consequent_7 = ($$anchor) => {
												add_svelte_meta(() => InfoIcon($$anchor, {}), 'component', Toaster, 344, 8, { componentTag: 'InfoIcon' });
											};

											add_svelte_meta(
												() => if_block(node_8, ($$render) => {
													if ($$props.infoIcon) $$render(consequent_6); else if (strict_equals($$props.infoIcon, null, false)) $$render(consequent_7, 1);
												}),
												'if',
												Toaster,
												341,
												7
											);
										}

										append($$anchor, fragment_11);
									});

									const closeIcon = wrap_snippet(Toaster, function ($$anchor) {
										validate_snippet_args(...arguments);

										var fragment_14 = comment();
										var node_10 = first_child(fragment_14);

										{
											var consequent_8 = ($$anchor) => {
												var fragment_15 = comment();
												var node_11 = first_child(fragment_15);

												add_svelte_meta(() => snippet(node_11, () => $$props.closeIcon ?? noop$1), 'render', Toaster, 350, 8);
												append($$anchor, fragment_15);
											};

											var consequent_9 = ($$anchor) => {
												add_svelte_meta(() => CloseIcon($$anchor, {}), 'component', Toaster, 352, 8, { componentTag: 'CloseIcon' });
											};

											add_svelte_meta(
												() => if_block(node_10, ($$render) => {
													if ($$props.closeIcon) $$render(consequent_8); else if (strict_equals($$props.closeIcon, null, false)) $$render(consequent_9, 1);
												}),
												'if',
												Toaster,
												349,
												7
											);
										}

										append($$anchor, fragment_14);
									});

									let $0 = user_derived(() => toastOptions()?.duration ?? duration());
									let $1 = user_derived(() => toastOptions()?.class ?? '');
									let $2 = user_derived(() => toastOptions()?.descriptionClass || '');
									let $3 = user_derived(() => toastOptions()?.style ?? '');
									let $4 = user_derived(() => toastOptions().classes || {});
									let $5 = user_derived(() => toastOptions().unstyled ?? false);
									let $6 = user_derived(() => toastOptions()?.cancelButtonStyle ?? '');
									let $7 = user_derived(() => toastOptions()?.actionButtonStyle ?? '');
									let $8 = user_derived(() => toastOptions()?.closeButtonAriaLabel ?? closeButtonAriaLabel());

									add_svelte_meta(
										() => Toast($$anchor, {
											get index() {
												return get$1(index);
											},

											get toast() {
												return get$1(toast);
											},

											get defaultRichColors() {
												return richColors();
											},

											get duration() {
												return get$1($0);
											},

											get class() {
												return get$1($1);
											},

											get descriptionClass() {
												return get$1($2);
											},

											get invert() {
												return invert();
											},

											get visibleToasts() {
												return visibleToasts();
											},

											get closeButton() {
												return closeButton();
											},

											get interacting() {
												return get$1(interacting);
											},

											get position() {
												return position;
											},

											get style() {
												return get$1($3);
											},

											get classes() {
												return get$1($4);
											},

											get unstyled() {
												return get$1($5);
											},

											get cancelButtonStyle() {
												return get$1($6);
											},

											get actionButtonStyle() {
												return get$1($7);
											},

											get closeButtonAriaLabel() {
												return get$1($8);
											},

											get expandByDefault() {
												return expand();
											},

											get expanded() {
												return get$1(expanded);
											},

											get pauseWhenPageIsHidden() {
												return pauseWhenPageIsHidden();
											},

											get loadingIcon() {
												return $$props.loadingIcon;
											},
											successIcon,
											errorIcon,
											warningIcon,
											infoIcon,
											closeIcon,
											$$slots: {
												successIcon: true,
												errorIcon: true,
												warningIcon: true,
												infoIcon: true,
												closeIcon: true
											}
										}),
										'component',
										Toaster,
										290,
										5,
										{ componentTag: 'Toast' }
									);
								}
							}),
							'each',
							Toaster,
							289,
							4
						);

						reset(ol);
						bind_this(ol, ($$value) => set(listRef, $$value), () => get$1(listRef));
						template_effect(() => ol.dir = ol.dir);
						append($$anchor, ol);
					}),
					'each',
					Toaster,
					247,
					2
				);

				append($$anchor, fragment);
			};

			add_svelte_meta(
				() => if_block(node, ($$render) => {
					if (toastState.toasts.length > 0) $$render(consequent_10);
				}),
				'if',
				Toaster,
				246,
				1
			);
		}
		template_effect(() => set_attribute(section, 'aria-label', `${containerAriaLabel() ?? ''} ${get$1(hotkeyLabel) ?? ''}`));
		append($$anchor, section);

		return pop($$exports);
	}

	/**
	 * Create a bound version of a function with a specified `this` context
	 *
	 * @param {Function} fn - The function to bind
	 * @param {*} thisArg - The value to be passed as the `this` parameter
	 * @returns {Function} A new function that will call the original function with the specified `this` context
	 */
	function bind(fn, thisArg) {
	  return function wrap() {
	    return fn.apply(thisArg, arguments);
	  };
	}

	// utils is a library of generic helper functions non-specific to axios

	const { toString } = Object.prototype;
	const { getPrototypeOf } = Object;
	const { iterator, toStringTag } = Symbol;

	const kindOf = ((cache) => (thing) => {
	  const str = toString.call(thing);
	  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
	})(Object.create(null));

	const kindOfTest = (type) => {
	  type = type.toLowerCase();
	  return (thing) => kindOf(thing) === type;
	};

	const typeOfTest = (type) => (thing) => typeof thing === type;

	/**
	 * Determine if a value is a non-null object
	 *
	 * @param {Object} val The value to test
	 *
	 * @returns {boolean} True if value is an Array, otherwise false
	 */
	const { isArray } = Array;

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
	  return (
	    val !== null &&
	    !isUndefined(val) &&
	    val.constructor !== null &&
	    !isUndefined(val.constructor) &&
	    isFunction$1(val.constructor.isBuffer) &&
	    val.constructor.isBuffer(val)
	  );
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
	  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
	    result = ArrayBuffer.isView(val);
	  } else {
	    result = val && val.buffer && isArrayBuffer(val.buffer);
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
	const isFunction$1 = typeOfTest('function');

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
	const isBoolean = (thing) => thing === true || thing === false;

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
	  return (
	    (prototype === null ||
	      prototype === Object.prototype ||
	      Object.getPrototypeOf(prototype) === null) &&
	    !(toStringTag in val) &&
	    !(iterator in val)
	  );
	};

	/**
	 * Determine if a value is an empty object (safely handles Buffers)
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is an empty object, otherwise false
	 */
	const isEmptyObject = (val) => {
	  // Early return for non-objects or Buffers to prevent RangeError
	  if (!isObject(val) || isBuffer(val)) {
	    return false;
	  }

	  try {
	    return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
	  } catch (e) {
	    // Fallback for any other objects that might cause RangeError with Object.keys()
	    return false;
	  }
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
	 * Determine if a value is a React Native Blob
	 * React Native "blob": an object with a `uri` attribute. Optionally, it can
	 * also have a `name` and `type` attribute to specify filename and content type
	 *
	 * @see https://github.com/facebook/react-native/blob/26684cf3adf4094eb6c405d345a75bf8c7c0bf88/Libraries/Network/FormData.js#L68-L71
	 * 
	 * @param {*} value The value to test
	 * 
	 * @returns {boolean} True if value is a React Native Blob, otherwise false
	 */
	const isReactNativeBlob = (value) => {
	  return !!(value && typeof value.uri !== 'undefined');
	};

	/**
	 * Determine if environment is React Native
	 * ReactNative `FormData` has a non-standard `getParts()` method
	 * 
	 * @param {*} formData The formData to test
	 * 
	 * @returns {boolean} True if environment is React Native, otherwise false
	 */
	const isReactNative = (formData) => formData && typeof formData.getParts !== 'undefined';

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
	const isStream = (val) => isObject(val) && isFunction$1(val.pipe);

	/**
	 * Determine if a value is a FormData
	 *
	 * @param {*} thing The value to test
	 *
	 * @returns {boolean} True if value is an FormData, otherwise false
	 */
	function getGlobal() {
	  if (typeof globalThis !== 'undefined') return globalThis;
	  if (typeof self !== 'undefined') return self;
	  if (typeof window !== 'undefined') return window;
	  if (typeof global !== 'undefined') return global;
	  return {};
	}

	const G = getGlobal();
	const FormDataCtor = typeof G.FormData !== 'undefined' ? G.FormData : undefined;

	const isFormData = (thing) => {
	  let kind;
	  return thing && (
	    (FormDataCtor && thing instanceof FormDataCtor) || (
	      isFunction$1(thing.append) && (
	        (kind = kindOf(thing)) === 'formdata' ||
	        // detect form-data instance
	        (kind === 'object' && isFunction$1(thing.toString) && thing.toString() === '[object FormData]')
	      )
	    )
	  );
	};

	/**
	 * Determine if a value is a URLSearchParams object
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
	 */
	const isURLSearchParams = kindOfTest('URLSearchParams');

	const [isReadableStream, isRequest, isResponse, isHeaders] = [
	  'ReadableStream',
	  'Request',
	  'Response',
	  'Headers',
	].map(kindOfTest);

	/**
	 * Trim excess whitespace off the beginning and end of a string
	 *
	 * @param {String} str The String to trim
	 *
	 * @returns {String} The String freed of excess whitespace
	 */
	const trim = (str) => {
	  return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
	};
	/**
	 * Iterate over an Array or an Object invoking a function for each item.
	 *
	 * If `obj` is an Array callback will be called passing
	 * the value, index, and complete array for each item.
	 *
	 * If 'obj' is an Object callback will be called passing
	 * the value, key, and complete object for each property.
	 *
	 * @param {Object|Array<unknown>} obj The object to iterate
	 * @param {Function} fn The callback to invoke for each item
	 *
	 * @param {Object} [options]
	 * @param {Boolean} [options.allOwnKeys = false]
	 * @returns {any}
	 */
	function forEach(obj, fn, { allOwnKeys = false } = {}) {
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
	    // Buffer check
	    if (isBuffer(obj)) {
	      return;
	    }

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

	/**
	 * Finds a key in an object, case-insensitive, returning the actual key name.
	 * Returns null if the object is a Buffer or if no match is found.
	 *
	 * @param {Object} obj - The object to search.
	 * @param {string} key - The key to find (case-insensitive).
	 * @returns {?string} The actual key name if found, otherwise null.
	 */
	function findKey(obj, key) {
	  if (isBuffer(obj)) {
	    return null;
	  }

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
	  if (typeof globalThis !== 'undefined') return globalThis;
	  return typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : global;
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
	 * const result = merge({foo: 123}, {foo: 456});
	 * console.log(result.foo); // outputs 456
	 * ```
	 *
	 * @param {Object} obj1 Object to merge
	 *
	 * @returns {Object} Result of all merge properties
	 */
	function merge(/* obj1, obj2, obj3, ... */) {
	  const { caseless, skipUndefined } = (isContextDefined(this) && this) || {};
	  const result = {};
	  const assignValue = (val, key) => {
	    // Skip dangerous property names to prevent prototype pollution
	    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
	      return;
	    }

	    const targetKey = (caseless && findKey(result, key)) || key;
	    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
	      result[targetKey] = merge(result[targetKey], val);
	    } else if (isPlainObject(val)) {
	      result[targetKey] = merge({}, val);
	    } else if (isArray(val)) {
	      result[targetKey] = val.slice();
	    } else if (!skipUndefined || !isUndefined(val)) {
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
	 * @param {Object} [options]
	 * @param {Boolean} [options.allOwnKeys]
	 * @returns {Object} The resulting value of object a
	 */
	const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
	  forEach(
	    b,
	    (val, key) => {
	      if (thisArg && isFunction$1(val)) {
	        Object.defineProperty(a, key, {
	          value: bind(val, thisArg),
	          writable: true,
	          enumerable: true,
	          configurable: true,
	        });
	      } else {
	        Object.defineProperty(a, key, {
	          value: val,
	          writable: true,
	          enumerable: true,
	          configurable: true,
	        });
	      }
	    },
	    { allOwnKeys }
	  );
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
	  if (content.charCodeAt(0) === 0xfeff) {
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
	  Object.defineProperty(constructor.prototype, 'constructor', {
	    value: constructor,
	    writable: true,
	    enumerable: false,
	    configurable: true,
	  });
	  Object.defineProperty(constructor, 'super', {
	    value: superConstructor.prototype,
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
	const isTypedArray = ((TypedArray) => {
	  // eslint-disable-next-line func-names
	  return (thing) => {
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
	  const generator = obj && obj[iterator];

	  const _iterator = generator.call(obj);

	  let result;

	  while ((result = _iterator.next()) && !result.done) {
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

	const toCamelCase = (str) => {
	  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
	    return p1.toUpperCase() + p2;
	  });
	};

	/* Creating a function that will check if an object has a property. */
	const hasOwnProperty = (
	  ({ hasOwnProperty }) =>
	  (obj, prop) =>
	    hasOwnProperty.call(obj, prop)
	)(Object.prototype);

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
	    let ret;
	    if ((ret = reducer(descriptor, name, obj)) !== false) {
	      reducedDescriptors[name] = ret || descriptor;
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
	    if (isFunction$1(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
	      return false;
	    }

	    const value = obj[name];

	    if (!isFunction$1(value)) return;

	    descriptor.enumerable = false;

	    if ('writable' in descriptor) {
	      descriptor.writable = false;
	      return;
	    }

	    if (!descriptor.set) {
	      descriptor.set = () => {
	        throw Error("Can not rewrite read-only method '" + name + "'");
	      };
	    }
	  });
	};

	/**
	 * Converts an array or a delimited string into an object set with values as keys and true as values.
	 * Useful for fast membership checks.
	 *
	 * @param {Array|string} arrayOrString - The array or string to convert.
	 * @param {string} delimiter - The delimiter to use if input is a string.
	 * @returns {Object} An object with keys from the array or string, values set to true.
	 */
	const toObjectSet = (arrayOrString, delimiter) => {
	  const obj = {};

	  const define = (arr) => {
	    arr.forEach((value) => {
	      obj[value] = true;
	    });
	  };

	  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));

	  return obj;
	};

	const noop = () => {};

	const toFiniteNumber = (value, defaultValue) => {
	  return value != null && Number.isFinite((value = +value)) ? value : defaultValue;
	};

	/**
	 * If the thing is a FormData object, return true, otherwise return false.
	 *
	 * @param {unknown} thing - The thing to check.
	 *
	 * @returns {boolean}
	 */
	function isSpecCompliantForm(thing) {
	  return !!(
	    thing &&
	    isFunction$1(thing.append) &&
	    thing[toStringTag] === 'FormData' &&
	    thing[iterator]
	  );
	}

	/**
	 * Recursively converts an object to a JSON-compatible object, handling circular references and Buffers.
	 *
	 * @param {Object} obj - The object to convert.
	 * @returns {Object} The JSON-compatible object.
	 */
	const toJSONObject = (obj) => {
	  const stack = new Array(10);

	  const visit = (source, i) => {
	    if (isObject(source)) {
	      if (stack.indexOf(source) >= 0) {
	        return;
	      }

	      //Buffer check
	      if (isBuffer(source)) {
	        return source;
	      }

	      if (!('toJSON' in source)) {
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

	/**
	 * Determines if a value is an async function.
	 *
	 * @param {*} thing - The value to test.
	 * @returns {boolean} True if value is an async function, otherwise false.
	 */
	const isAsyncFn = kindOfTest('AsyncFunction');

	/**
	 * Determines if a value is thenable (has then and catch methods).
	 *
	 * @param {*} thing - The value to test.
	 * @returns {boolean} True if value is thenable, otherwise false.
	 */
	const isThenable = (thing) =>
	  thing &&
	  (isObject(thing) || isFunction$1(thing)) &&
	  isFunction$1(thing.then) &&
	  isFunction$1(thing.catch);

	// original code
	// https://github.com/DigitalBrainJS/AxiosPromise/blob/16deab13710ec09779922131f3fa5954320f83ab/lib/utils.js#L11-L34

	/**
	 * Provides a cross-platform setImmediate implementation.
	 * Uses native setImmediate if available, otherwise falls back to postMessage or setTimeout.
	 *
	 * @param {boolean} setImmediateSupported - Whether setImmediate is supported.
	 * @param {boolean} postMessageSupported - Whether postMessage is supported.
	 * @returns {Function} A function to schedule a callback asynchronously.
	 */
	const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
	  if (setImmediateSupported) {
	    return setImmediate;
	  }

	  return postMessageSupported
	    ? ((token, callbacks) => {
	        _global.addEventListener(
	          'message',
	          ({ source, data }) => {
	            if (source === _global && data === token) {
	              callbacks.length && callbacks.shift()();
	            }
	          },
	          false
	        );

	        return (cb) => {
	          callbacks.push(cb);
	          _global.postMessage(token, '*');
	        };
	      })(`axios@${Math.random()}`, [])
	    : (cb) => setTimeout(cb);
	})(typeof setImmediate === 'function', isFunction$1(_global.postMessage));

	/**
	 * Schedules a microtask or asynchronous callback as soon as possible.
	 * Uses queueMicrotask if available, otherwise falls back to process.nextTick or _setImmediate.
	 *
	 * @type {Function}
	 */
	const asap =
	  typeof queueMicrotask !== 'undefined'
	    ? queueMicrotask.bind(_global)
	    : (typeof process !== 'undefined' && process.nextTick) || _setImmediate;

	// *********************

	const isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);

	var utils$1 = {
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
	  isEmptyObject,
	  isReadableStream,
	  isRequest,
	  isResponse,
	  isHeaders,
	  isUndefined,
	  isDate,
	  isFile,
	  isReactNativeBlob,
	  isReactNative,
	  isBlob,
	  isRegExp,
	  isFunction: isFunction$1,
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
	  isSpecCompliantForm,
	  toJSONObject,
	  isAsyncFn,
	  isThenable,
	  setImmediate: _setImmediate,
	  asap,
	  isIterable,
	};

	let AxiosError$1 = class AxiosError extends Error {
	  static from(error, code, config, request, response, customProps) {
	    const axiosError = new AxiosError(error.message, code || error.code, config, request, response);
	    axiosError.cause = error;
	    axiosError.name = error.name;

	    // Preserve status from the original error if not already set from response
	    if (error.status != null && axiosError.status == null) {
	      axiosError.status = error.status;
	    }

	    customProps && Object.assign(axiosError, customProps);
	    return axiosError;
	  }

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
	    constructor(message, code, config, request, response) {
	      super(message);
	      
	      // Make message enumerable to maintain backward compatibility
	      // The native Error constructor sets message as non-enumerable,
	      // but axios < v1.13.3 had it as enumerable
	      Object.defineProperty(this, 'message', {
	          value: message,
	          enumerable: true,
	          writable: true,
	          configurable: true
	      });
	      
	      this.name = 'AxiosError';
	      this.isAxiosError = true;
	      code && (this.code = code);
	      config && (this.config = config);
	      request && (this.request = request);
	      if (response) {
	          this.response = response;
	          this.status = response.status;
	      }
	    }

	  toJSON() {
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
	      config: utils$1.toJSONObject(this.config),
	      code: this.code,
	      status: this.status,
	    };
	  }
	};

	// This can be changed to static properties as soon as the parser options in .eslint.cjs are updated.
	AxiosError$1.ERR_BAD_OPTION_VALUE = 'ERR_BAD_OPTION_VALUE';
	AxiosError$1.ERR_BAD_OPTION = 'ERR_BAD_OPTION';
	AxiosError$1.ECONNABORTED = 'ECONNABORTED';
	AxiosError$1.ETIMEDOUT = 'ETIMEDOUT';
	AxiosError$1.ERR_NETWORK = 'ERR_NETWORK';
	AxiosError$1.ERR_FR_TOO_MANY_REDIRECTS = 'ERR_FR_TOO_MANY_REDIRECTS';
	AxiosError$1.ERR_DEPRECATED = 'ERR_DEPRECATED';
	AxiosError$1.ERR_BAD_RESPONSE = 'ERR_BAD_RESPONSE';
	AxiosError$1.ERR_BAD_REQUEST = 'ERR_BAD_REQUEST';
	AxiosError$1.ERR_CANCELED = 'ERR_CANCELED';
	AxiosError$1.ERR_NOT_SUPPORT = 'ERR_NOT_SUPPORT';
	AxiosError$1.ERR_INVALID_URL = 'ERR_INVALID_URL';

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
	  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
	}

	/**
	 * It removes the brackets from the end of a string
	 *
	 * @param {string} key - The key of the parameter.
	 *
	 * @returns {string} the key without the brackets.
	 */
	function removeBrackets(key) {
	  return utils$1.endsWith(key, '[]') ? key.slice(0, -2) : key;
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
	  return path
	    .concat(key)
	    .map(function each(token, i) {
	      // eslint-disable-next-line no-param-reassign
	      token = removeBrackets(token);
	      return !dots && i ? '[' + token + ']' : token;
	    })
	    .join(dots ? '.' : '');
	}

	/**
	 * If the array is an array and none of its elements are visitable, then it's a flat array.
	 *
	 * @param {Array<any>} arr - The array to check
	 *
	 * @returns {boolean}
	 */
	function isFlatArray(arr) {
	  return utils$1.isArray(arr) && !arr.some(isVisitable);
	}

	const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
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
	function toFormData$1(obj, formData, options) {
	  if (!utils$1.isObject(obj)) {
	    throw new TypeError('target must be an object');
	  }

	  // eslint-disable-next-line no-param-reassign
	  formData = formData || new (FormData)();

	  // eslint-disable-next-line no-param-reassign
	  options = utils$1.toFlatObject(
	    options,
	    {
	      metaTokens: true,
	      dots: false,
	      indexes: false,
	    },
	    false,
	    function defined(option, source) {
	      // eslint-disable-next-line no-eq-null,eqeqeq
	      return !utils$1.isUndefined(source[option]);
	    }
	  );

	  const metaTokens = options.metaTokens;
	  // eslint-disable-next-line no-use-before-define
	  const visitor = options.visitor || defaultVisitor;
	  const dots = options.dots;
	  const indexes = options.indexes;
	  const _Blob = options.Blob || (typeof Blob !== 'undefined' && Blob);
	  const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);

	  if (!utils$1.isFunction(visitor)) {
	    throw new TypeError('visitor must be a function');
	  }

	  function convertValue(value) {
	    if (value === null) return '';

	    if (utils$1.isDate(value)) {
	      return value.toISOString();
	    }

	    if (utils$1.isBoolean(value)) {
	      return value.toString();
	    }

	    if (!useBlob && utils$1.isBlob(value)) {
	      throw new AxiosError$1('Blob is not supported. Use a Buffer instead.');
	    }

	    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
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

	    if (utils$1.isReactNative(formData) && utils$1.isReactNativeBlob(value)) {
	      formData.append(renderKey(path, key, dots), convertValue(value));
	      return false;
	    }

	    if (value && !path && typeof value === 'object') {
	      if (utils$1.endsWith(key, '{}')) {
	        // eslint-disable-next-line no-param-reassign
	        key = metaTokens ? key : key.slice(0, -2);
	        // eslint-disable-next-line no-param-reassign
	        value = JSON.stringify(value);
	      } else if (
	        (utils$1.isArray(value) && isFlatArray(value)) ||
	        ((utils$1.isFileList(value) || utils$1.endsWith(key, '[]')) && (arr = utils$1.toArray(value)))
	      ) {
	        // eslint-disable-next-line no-param-reassign
	        key = removeBrackets(key);

	        arr.forEach(function each(el, index) {
	          !(utils$1.isUndefined(el) || el === null) &&
	            formData.append(
	              // eslint-disable-next-line no-nested-ternary
	              indexes === true
	                ? renderKey([key], index, dots)
	                : indexes === null
	                  ? key
	                  : key + '[]',
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
	    isVisitable,
	  });

	  function build(value, path) {
	    if (utils$1.isUndefined(value)) return;

	    if (stack.indexOf(value) !== -1) {
	      throw Error('Circular reference detected in ' + path.join('.'));
	    }

	    stack.push(value);

	    utils$1.forEach(value, function each(el, key) {
	      const result =
	        !(utils$1.isUndefined(el) || el === null) &&
	        visitor.call(formData, el, utils$1.isString(key) ? key.trim() : key, path, exposedHelpers);

	      if (result === true) {
	        build(el, path ? path.concat(key) : [key]);
	      }
	    });

	    stack.pop();
	  }

	  if (!utils$1.isObject(obj)) {
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
	    '%00': '\x00',
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

	  params && toFormData$1(params, this, options);
	}

	const prototype = AxiosURLSearchParams.prototype;

	prototype.append = function append(name, value) {
	  this._pairs.push([name, value]);
	};

	prototype.toString = function toString(encoder) {
	  const _encode = encoder
	    ? function (value) {
	        return encoder.call(this, value, encode$1);
	      }
	    : encode$1;

	  return this._pairs
	    .map(function each(pair) {
	      return _encode(pair[0]) + '=' + _encode(pair[1]);
	    }, '')
	    .join('&');
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
	  return encodeURIComponent(val)
	    .replace(/%3A/gi, ':')
	    .replace(/%24/g, '$')
	    .replace(/%2C/gi, ',')
	    .replace(/%20/g, '+');
	}

	/**
	 * Build a URL by appending params to the end
	 *
	 * @param {string} url The base of the url (e.g., http://www.google.com)
	 * @param {object} [params] The params to be appended
	 * @param {?(object|Function)} options
	 *
	 * @returns {string} The formatted url
	 */
	function buildURL(url, params, options) {
	  if (!params) {
	    return url;
	  }

	  const _encode = (options && options.encode) || encode;

	  const _options = utils$1.isFunction(options)
	    ? {
	        serialize: options,
	      }
	    : options;

	  const serializeFn = _options && _options.serialize;

	  let serializedParams;

	  if (serializeFn) {
	    serializedParams = serializeFn(params, _options);
	  } else {
	    serializedParams = utils$1.isURLSearchParams(params)
	      ? params.toString()
	      : new AxiosURLSearchParams(params, _options).toString(_encode);
	  }

	  if (serializedParams) {
	    const hashmarkIndex = url.indexOf('#');

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
	   * @param {Object} options The options for the interceptor, synchronous and runWhen
	   *
	   * @return {Number} An ID used to remove interceptor later
	   */
	  use(fulfilled, rejected, options) {
	    this.handlers.push({
	      fulfilled,
	      rejected,
	      synchronous: options ? options.synchronous : false,
	      runWhen: options ? options.runWhen : null,
	    });
	    return this.handlers.length - 1;
	  }

	  /**
	   * Remove an interceptor from the stack
	   *
	   * @param {Number} id The ID that was returned by `use`
	   *
	   * @returns {void}
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
	    utils$1.forEach(this.handlers, function forEachHandler(h) {
	      if (h !== null) {
	        fn(h);
	      }
	    });
	  }
	}

	var transitionalDefaults = {
	  silentJSONParsing: true,
	  forcedJSONParsing: true,
	  clarifyTimeoutError: false,
	  legacyInterceptorReqResOrdering: true,
	};

	var URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

	var FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

	var Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

	var platform$1 = {
	  isBrowser: true,
	  classes: {
	    URLSearchParams: URLSearchParams$1,
	    FormData: FormData$1,
	    Blob: Blob$1,
	  },
	  protocols: ['http', 'https', 'file', 'blob', 'url', 'data'],
	};

	const hasBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

	const _navigator = (typeof navigator === 'object' && navigator) || undefined;

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
	const hasStandardBrowserEnv =
	  hasBrowserEnv &&
	  (!_navigator || ['ReactNative', 'NativeScript', 'NS'].indexOf(_navigator.product) < 0);

	/**
	 * Determine if we're running in a standard browser webWorker environment
	 *
	 * Although the `isStandardBrowserEnv` method indicates that
	 * `allows axios to run in a web worker`, the WebWorker will still be
	 * filtered out due to its judgment standard
	 * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
	 * This leads to a problem when axios post `FormData` in webWorker
	 */
	const hasStandardBrowserWebWorkerEnv = (() => {
	  return (
	    typeof WorkerGlobalScope !== 'undefined' &&
	    // eslint-disable-next-line no-undef
	    self instanceof WorkerGlobalScope &&
	    typeof self.importScripts === 'function'
	  );
	})();

	const origin = (hasBrowserEnv && window.location.href) || 'http://localhost';

	var utils = /*#__PURE__*/Object.freeze({
		__proto__: null,
		hasBrowserEnv: hasBrowserEnv,
		hasStandardBrowserEnv: hasStandardBrowserEnv,
		hasStandardBrowserWebWorkerEnv: hasStandardBrowserWebWorkerEnv,
		navigator: _navigator,
		origin: origin
	});

	var platform = {
	  ...utils,
	  ...platform$1,
	};

	function toURLEncodedForm(data, options) {
	  return toFormData$1(data, new platform.classes.URLSearchParams(), {
	    visitor: function (value, key, path, helpers) {
	      if (platform.isNode && utils$1.isBuffer(value)) {
	        this.append(key, value.toString('base64'));
	        return false;
	      }

	      return helpers.defaultVisitor.apply(this, arguments);
	    },
	    ...options,
	  });
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
	  return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
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

	    if (name === '__proto__') return true;

	    const isNumericKey = Number.isFinite(+name);
	    const isLast = index >= path.length;
	    name = !name && utils$1.isArray(target) ? target.length : name;

	    if (isLast) {
	      if (utils$1.hasOwnProp(target, name)) {
	        target[name] = [target[name], value];
	      } else {
	        target[name] = value;
	      }

	      return !isNumericKey;
	    }

	    if (!target[name] || !utils$1.isObject(target[name])) {
	      target[name] = [];
	    }

	    const result = buildPath(path, value, target[name], index);

	    if (result && utils$1.isArray(target[name])) {
	      target[name] = arrayToObject(target[name]);
	    }

	    return !isNumericKey;
	  }

	  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
	    const obj = {};

	    utils$1.forEachEntry(formData, (name, value) => {
	      buildPath(parsePropPath(name), value, obj, 0);
	    });

	    return obj;
	  }

	  return null;
	}

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
	  if (utils$1.isString(rawValue)) {
	    try {
	      (parser || JSON.parse)(rawValue);
	      return utils$1.trim(rawValue);
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

	  adapter: ['xhr', 'http', 'fetch'],

	  transformRequest: [
	    function transformRequest(data, headers) {
	      const contentType = headers.getContentType() || '';
	      const hasJSONContentType = contentType.indexOf('application/json') > -1;
	      const isObjectPayload = utils$1.isObject(data);

	      if (isObjectPayload && utils$1.isHTMLForm(data)) {
	        data = new FormData(data);
	      }

	      const isFormData = utils$1.isFormData(data);

	      if (isFormData) {
	        return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
	      }

	      if (
	        utils$1.isArrayBuffer(data) ||
	        utils$1.isBuffer(data) ||
	        utils$1.isStream(data) ||
	        utils$1.isFile(data) ||
	        utils$1.isBlob(data) ||
	        utils$1.isReadableStream(data)
	      ) {
	        return data;
	      }
	      if (utils$1.isArrayBufferView(data)) {
	        return data.buffer;
	      }
	      if (utils$1.isURLSearchParams(data)) {
	        headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
	        return data.toString();
	      }

	      let isFileList;

	      if (isObjectPayload) {
	        if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
	          return toURLEncodedForm(data, this.formSerializer).toString();
	        }

	        if (
	          (isFileList = utils$1.isFileList(data)) ||
	          contentType.indexOf('multipart/form-data') > -1
	        ) {
	          const _FormData = this.env && this.env.FormData;

	          return toFormData$1(
	            isFileList ? { 'files[]': data } : data,
	            _FormData && new _FormData(),
	            this.formSerializer
	          );
	        }
	      }

	      if (isObjectPayload || hasJSONContentType) {
	        headers.setContentType('application/json', false);
	        return stringifySafely(data);
	      }

	      return data;
	    },
	  ],

	  transformResponse: [
	    function transformResponse(data) {
	      const transitional = this.transitional || defaults.transitional;
	      const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
	      const JSONRequested = this.responseType === 'json';

	      if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
	        return data;
	      }

	      if (
	        data &&
	        utils$1.isString(data) &&
	        ((forcedJSONParsing && !this.responseType) || JSONRequested)
	      ) {
	        const silentJSONParsing = transitional && transitional.silentJSONParsing;
	        const strictJSONParsing = !silentJSONParsing && JSONRequested;

	        try {
	          return JSON.parse(data, this.parseReviver);
	        } catch (e) {
	          if (strictJSONParsing) {
	            if (e.name === 'SyntaxError') {
	              throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, this.response);
	            }
	            throw e;
	          }
	        }
	      }

	      return data;
	    },
	  ],

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
	    Blob: platform.classes.Blob,
	  },

	  validateStatus: function validateStatus(status) {
	    return status >= 200 && status < 300;
	  },

	  headers: {
	    common: {
	      Accept: 'application/json, text/plain, */*',
	      'Content-Type': undefined,
	    },
	  },
	};

	utils$1.forEach(['delete', 'get', 'head', 'post', 'put', 'patch'], (method) => {
	  defaults.headers[method] = {};
	});

	// RawAxiosHeaders whose duplicates are ignored by node
	// c.f. https://nodejs.org/api/http.html#http_message_headers
	const ignoreDuplicateOf = utils$1.toObjectSet([
	  'age',
	  'authorization',
	  'content-length',
	  'content-type',
	  'etag',
	  'expires',
	  'from',
	  'host',
	  'if-modified-since',
	  'if-unmodified-since',
	  'last-modified',
	  'location',
	  'max-forwards',
	  'proxy-authorization',
	  'referer',
	  'retry-after',
	  'user-agent',
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
	var parseHeaders = (rawHeaders) => {
	  const parsed = {};
	  let key;
	  let val;
	  let i;

	  rawHeaders &&
	    rawHeaders.split('\n').forEach(function parser(line) {
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

	  return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
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
	  if (utils$1.isFunction(filter)) {
	    return filter.call(this, value, header);
	  }

	  if (isHeaderNameFilter) {
	    value = header;
	  }

	  if (!utils$1.isString(value)) return;

	  if (utils$1.isString(filter)) {
	    return value.indexOf(filter) !== -1;
	  }

	  if (utils$1.isRegExp(filter)) {
	    return filter.test(value);
	  }
	}

	function formatHeader(header) {
	  return header
	    .trim()
	    .toLowerCase()
	    .replace(/([a-z\d])(\w*)/g, (w, char, str) => {
	      return char.toUpperCase() + str;
	    });
	}

	function buildAccessors(obj, header) {
	  const accessorName = utils$1.toCamelCase(' ' + header);

	  ['get', 'set', 'has'].forEach((methodName) => {
	    Object.defineProperty(obj, methodName + accessorName, {
	      value: function (arg1, arg2, arg3) {
	        return this[methodName].call(this, header, arg1, arg2, arg3);
	      },
	      configurable: true,
	    });
	  });
	}

	let AxiosHeaders$1 = class AxiosHeaders {
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

	      const key = utils$1.findKey(self, lHeader);

	      if (
	        !key ||
	        self[key] === undefined ||
	        _rewrite === true ||
	        (_rewrite === undefined && self[key] !== false)
	      ) {
	        self[key || _header] = normalizeValue(_value);
	      }
	    }

	    const setHeaders = (headers, _rewrite) =>
	      utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

	    if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
	      setHeaders(header, valueOrRewrite);
	    } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
	      setHeaders(parseHeaders(header), valueOrRewrite);
	    } else if (utils$1.isObject(header) && utils$1.isIterable(header)) {
	      let obj = {},
	        dest,
	        key;
	      for (const entry of header) {
	        if (!utils$1.isArray(entry)) {
	          throw TypeError('Object iterator must return a key-value pair');
	        }

	        obj[(key = entry[0])] = (dest = obj[key])
	          ? utils$1.isArray(dest)
	            ? [...dest, entry[1]]
	            : [dest, entry[1]]
	          : entry[1];
	      }

	      setHeaders(obj, valueOrRewrite);
	    } else {
	      header != null && setHeader(valueOrRewrite, header, rewrite);
	    }

	    return this;
	  }

	  get(header, parser) {
	    header = normalizeHeader(header);

	    if (header) {
	      const key = utils$1.findKey(this, header);

	      if (key) {
	        const value = this[key];

	        if (!parser) {
	          return value;
	        }

	        if (parser === true) {
	          return parseTokens(value);
	        }

	        if (utils$1.isFunction(parser)) {
	          return parser.call(this, value, key);
	        }

	        if (utils$1.isRegExp(parser)) {
	          return parser.exec(value);
	        }

	        throw new TypeError('parser must be boolean|regexp|function');
	      }
	    }
	  }

	  has(header, matcher) {
	    header = normalizeHeader(header);

	    if (header) {
	      const key = utils$1.findKey(this, header);

	      return !!(
	        key &&
	        this[key] !== undefined &&
	        (!matcher || matchHeaderValue(this, this[key], key, matcher))
	      );
	    }

	    return false;
	  }

	  delete(header, matcher) {
	    const self = this;
	    let deleted = false;

	    function deleteHeader(_header) {
	      _header = normalizeHeader(_header);

	      if (_header) {
	        const key = utils$1.findKey(self, _header);

	        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
	          delete self[key];

	          deleted = true;
	        }
	      }
	    }

	    if (utils$1.isArray(header)) {
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
	      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
	        delete this[key];
	        deleted = true;
	      }
	    }

	    return deleted;
	  }

	  normalize(format) {
	    const self = this;
	    const headers = {};

	    utils$1.forEach(this, (value, header) => {
	      const key = utils$1.findKey(headers, header);

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

	    utils$1.forEach(this, (value, header) => {
	      value != null &&
	        value !== false &&
	        (obj[header] = asStrings && utils$1.isArray(value) ? value.join(', ') : value);
	    });

	    return obj;
	  }

	  [Symbol.iterator]() {
	    return Object.entries(this.toJSON())[Symbol.iterator]();
	  }

	  toString() {
	    return Object.entries(this.toJSON())
	      .map(([header, value]) => header + ': ' + value)
	      .join('\n');
	  }

	  getSetCookie() {
	    return this.get('set-cookie') || [];
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
	    const internals =
	      (this[$internals] =
	      this[$internals] =
	        {
	          accessors: {},
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

	    utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

	    return this;
	  }
	};

	AxiosHeaders$1.accessor([
	  'Content-Type',
	  'Content-Length',
	  'Accept',
	  'Accept-Encoding',
	  'User-Agent',
	  'Authorization',
	]);

	// reserved names hotfix
	utils$1.reduceDescriptors(AxiosHeaders$1.prototype, ({ value }, key) => {
	  let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
	  return {
	    get: () => value,
	    set(headerValue) {
	      this[mapped] = headerValue;
	    },
	  };
	});

	utils$1.freezeMethods(AxiosHeaders$1);

	/**
	 * Transform the data for a request or a response
	 *
	 * @param {Array|Function} fns A single function or Array of functions
	 * @param {?Object} response The response object
	 *
	 * @returns {*} The resulting transformed data
	 */
	function transformData(fns, response) {
	  const config = this || defaults;
	  const context = response || config;
	  const headers = AxiosHeaders$1.from(context.headers);
	  let data = context.data;

	  utils$1.forEach(fns, function transform(fn) {
	    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
	  });

	  headers.normalize();

	  return data;
	}

	function isCancel$1(value) {
	  return !!(value && value.__CANCEL__);
	}

	let CanceledError$1 = class CanceledError extends AxiosError$1 {
	  /**
	   * A `CanceledError` is an object that is thrown when an operation is canceled.
	   *
	   * @param {string=} message The message.
	   * @param {Object=} config The config.
	   * @param {Object=} request The request.
	   *
	   * @returns {CanceledError} The created error.
	   */
	  constructor(message, config, request) {
	    super(message == null ? 'canceled' : message, AxiosError$1.ERR_CANCELED, config, request);
	    this.name = 'CanceledError';
	    this.__CANCEL__ = true;
	  }
	};

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
	    reject(
	      new AxiosError$1(
	        'Request failed with status code ' + response.status,
	        [AxiosError$1.ERR_BAD_REQUEST, AxiosError$1.ERR_BAD_RESPONSE][
	          Math.floor(response.status / 100) - 4
	        ],
	        response.config,
	        response.request,
	        response
	      )
	    );
	  }
	}

	function parseProtocol(url) {
	  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
	  return (match && match[1]) || '';
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

	    return passed ? Math.round((bytesCount * 1000) / passed) : undefined;
	  };
	}

	/**
	 * Throttle decorator
	 * @param {Function} fn
	 * @param {Number} freq
	 * @return {Function}
	 */
	function throttle(fn, freq) {
	  let timestamp = 0;
	  let threshold = 1000 / freq;
	  let lastArgs;
	  let timer;

	  const invoke = (args, now = Date.now()) => {
	    timestamp = now;
	    lastArgs = null;
	    if (timer) {
	      clearTimeout(timer);
	      timer = null;
	    }
	    fn(...args);
	  };

	  const throttled = (...args) => {
	    const now = Date.now();
	    const passed = now - timestamp;
	    if (passed >= threshold) {
	      invoke(args, now);
	    } else {
	      lastArgs = args;
	      if (!timer) {
	        timer = setTimeout(() => {
	          timer = null;
	          invoke(lastArgs);
	        }, threshold - passed);
	      }
	    }
	  };

	  const flush = () => lastArgs && invoke(lastArgs);

	  return [throttled, flush];
	}

	const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
	  let bytesNotified = 0;
	  const _speedometer = speedometer(50, 250);

	  return throttle((e) => {
	    const loaded = e.loaded;
	    const total = e.lengthComputable ? e.total : undefined;
	    const progressBytes = loaded - bytesNotified;
	    const rate = _speedometer(progressBytes);
	    const inRange = loaded <= total;

	    bytesNotified = loaded;

	    const data = {
	      loaded,
	      total,
	      progress: total ? loaded / total : undefined,
	      bytes: progressBytes,
	      rate: rate ? rate : undefined,
	      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
	      event: e,
	      lengthComputable: total != null,
	      [isDownloadStream ? 'download' : 'upload']: true,
	    };

	    listener(data);
	  }, freq);
	};

	const progressEventDecorator = (total, throttled) => {
	  const lengthComputable = total != null;

	  return [
	    (loaded) =>
	      throttled[0]({
	        lengthComputable,
	        total,
	        loaded,
	      }),
	    throttled[1],
	  ];
	};

	const asyncDecorator =
	  (fn) =>
	  (...args) =>
	    utils$1.asap(() => fn(...args));

	var isURLSameOrigin = platform.hasStandardBrowserEnv
	  ? ((origin, isMSIE) => (url) => {
	      url = new URL(url, platform.origin);

	      return (
	        origin.protocol === url.protocol &&
	        origin.host === url.host &&
	        (isMSIE || origin.port === url.port)
	      );
	    })(
	      new URL(platform.origin),
	      platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
	    )
	  : () => true;

	var cookies = platform.hasStandardBrowserEnv
	  ? // Standard browser envs support document.cookie
	    {
	      write(name, value, expires, path, domain, secure, sameSite) {
	        if (typeof document === 'undefined') return;

	        const cookie = [`${name}=${encodeURIComponent(value)}`];

	        if (utils$1.isNumber(expires)) {
	          cookie.push(`expires=${new Date(expires).toUTCString()}`);
	        }
	        if (utils$1.isString(path)) {
	          cookie.push(`path=${path}`);
	        }
	        if (utils$1.isString(domain)) {
	          cookie.push(`domain=${domain}`);
	        }
	        if (secure === true) {
	          cookie.push('secure');
	        }
	        if (utils$1.isString(sameSite)) {
	          cookie.push(`SameSite=${sameSite}`);
	        }

	        document.cookie = cookie.join('; ');
	      },

	      read(name) {
	        if (typeof document === 'undefined') return null;
	        const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
	        return match ? decodeURIComponent(match[1]) : null;
	      },

	      remove(name) {
	        this.write(name, '', Date.now() - 86400000, '/');
	      },
	    }
	  : // Non-standard browser env (web workers, react-native) lack needed support.
	    {
	      write() {},
	      read() {
	        return null;
	      },
	      remove() {},
	    };

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
	  if (typeof url !== 'string') {
	    return false;
	  }

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
	    ? baseURL.replace(/\/?\/$/, '') + '/' + relativeURL.replace(/^\/+/, '')
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
	function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
	  let isRelativeUrl = !isAbsoluteURL(requestedURL);
	  if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
	    return combineURLs(baseURL, requestedURL);
	  }
	  return requestedURL;
	}

	const headersToObject = (thing) => (thing instanceof AxiosHeaders$1 ? { ...thing } : thing);

	/**
	 * Config-specific merge-function which creates a new config-object
	 * by merging two configuration objects together.
	 *
	 * @param {Object} config1
	 * @param {Object} config2
	 *
	 * @returns {Object} New object resulting from merging config2 to config1
	 */
	function mergeConfig$1(config1, config2) {
	  // eslint-disable-next-line no-param-reassign
	  config2 = config2 || {};
	  const config = {};

	  function getMergedValue(target, source, prop, caseless) {
	    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
	      return utils$1.merge.call({ caseless }, target, source);
	    } else if (utils$1.isPlainObject(source)) {
	      return utils$1.merge({}, source);
	    } else if (utils$1.isArray(source)) {
	      return source.slice();
	    }
	    return source;
	  }

	  function mergeDeepProperties(a, b, prop, caseless) {
	    if (!utils$1.isUndefined(b)) {
	      return getMergedValue(a, b, prop, caseless);
	    } else if (!utils$1.isUndefined(a)) {
	      return getMergedValue(undefined, a, prop, caseless);
	    }
	  }

	  // eslint-disable-next-line consistent-return
	  function valueFromConfig2(a, b) {
	    if (!utils$1.isUndefined(b)) {
	      return getMergedValue(undefined, b);
	    }
	  }

	  // eslint-disable-next-line consistent-return
	  function defaultToConfig2(a, b) {
	    if (!utils$1.isUndefined(b)) {
	      return getMergedValue(undefined, b);
	    } else if (!utils$1.isUndefined(a)) {
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
	    withXSRFToken: defaultToConfig2,
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
	    headers: (a, b, prop) =>
	      mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true),
	  };

	  utils$1.forEach(Object.keys({ ...config1, ...config2 }), function computeConfigValue(prop) {
	    if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype') return;
	    const merge = utils$1.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
	    const configValue = merge(config1[prop], config2[prop], prop);
	    (utils$1.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
	  });

	  return config;
	}

	var resolveConfig = (config) => {
	  const newConfig = mergeConfig$1({}, config);

	  let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;

	  newConfig.headers = headers = AxiosHeaders$1.from(headers);

	  newConfig.url = buildURL(
	    buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls),
	    config.params,
	    config.paramsSerializer
	  );

	  // HTTP basic authentication
	  if (auth) {
	    headers.set(
	      'Authorization',
	      'Basic ' +
	        btoa(
	          (auth.username || '') +
	            ':' +
	            (auth.password ? unescape(encodeURIComponent(auth.password)) : '')
	        )
	    );
	  }

	  if (utils$1.isFormData(data)) {
	    if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv) {
	      headers.setContentType(undefined); // browser handles it
	    } else if (utils$1.isFunction(data.getHeaders)) {
	      // Node.js FormData (like form-data package)
	      const formHeaders = data.getHeaders();
	      // Only set safe headers to avoid overwriting security headers
	      const allowedHeaders = ['content-type', 'content-length'];
	      Object.entries(formHeaders).forEach(([key, val]) => {
	        if (allowedHeaders.includes(key.toLowerCase())) {
	          headers.set(key, val);
	        }
	      });
	    }
	  }

	  // Add xsrf header
	  // This is only done if running in a standard browser environment.
	  // Specifically not if we're in a web worker, or react-native.

	  if (platform.hasStandardBrowserEnv) {
	    withXSRFToken && utils$1.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));

	    if (withXSRFToken || (withXSRFToken !== false && isURLSameOrigin(newConfig.url))) {
	      // Add xsrf header
	      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);

	      if (xsrfValue) {
	        headers.set(xsrfHeaderName, xsrfValue);
	      }
	    }
	  }

	  return newConfig;
	};

	const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

	var xhrAdapter = isXHRAdapterSupported &&
	  function (config) {
	    return new Promise(function dispatchXhrRequest(resolve, reject) {
	      const _config = resolveConfig(config);
	      let requestData = _config.data;
	      const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
	      let { responseType, onUploadProgress, onDownloadProgress } = _config;
	      let onCanceled;
	      let uploadThrottled, downloadThrottled;
	      let flushUpload, flushDownload;

	      function done() {
	        flushUpload && flushUpload(); // flush events
	        flushDownload && flushDownload(); // flush events

	        _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);

	        _config.signal && _config.signal.removeEventListener('abort', onCanceled);
	      }

	      let request = new XMLHttpRequest();

	      request.open(_config.method.toUpperCase(), _config.url, true);

	      // Set the request timeout in MS
	      request.timeout = _config.timeout;

	      function onloadend() {
	        if (!request) {
	          return;
	        }
	        // Prepare the response
	        const responseHeaders = AxiosHeaders$1.from(
	          'getAllResponseHeaders' in request && request.getAllResponseHeaders()
	        );
	        const responseData =
	          !responseType || responseType === 'text' || responseType === 'json'
	            ? request.responseText
	            : request.response;
	        const response = {
	          data: responseData,
	          status: request.status,
	          statusText: request.statusText,
	          headers: responseHeaders,
	          config,
	          request,
	        };

	        settle(
	          function _resolve(value) {
	            resolve(value);
	            done();
	          },
	          function _reject(err) {
	            reject(err);
	            done();
	          },
	          response
	        );

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
	          if (
	            request.status === 0 &&
	            !(request.responseURL && request.responseURL.indexOf('file:') === 0)
	          ) {
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

	        reject(new AxiosError$1('Request aborted', AxiosError$1.ECONNABORTED, config, request));

	        // Clean up request
	        request = null;
	      };

	      // Handle low level network errors
	      request.onerror = function handleError(event) {
	        // Browsers deliver a ProgressEvent in XHR onerror
	        // (message may be empty; when present, surface it)
	        // See https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/error_event
	        const msg = event && event.message ? event.message : 'Network Error';
	        const err = new AxiosError$1(msg, AxiosError$1.ERR_NETWORK, config, request);
	        // attach the underlying event for consumers who want details
	        err.event = event || null;
	        reject(err);
	        request = null;
	      };

	      // Handle timeout
	      request.ontimeout = function handleTimeout() {
	        let timeoutErrorMessage = _config.timeout
	          ? 'timeout of ' + _config.timeout + 'ms exceeded'
	          : 'timeout exceeded';
	        const transitional = _config.transitional || transitionalDefaults;
	        if (_config.timeoutErrorMessage) {
	          timeoutErrorMessage = _config.timeoutErrorMessage;
	        }
	        reject(
	          new AxiosError$1(
	            timeoutErrorMessage,
	            transitional.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
	            config,
	            request
	          )
	        );

	        // Clean up request
	        request = null;
	      };

	      // Remove Content-Type if data is undefined
	      requestData === undefined && requestHeaders.setContentType(null);

	      // Add headers to the request
	      if ('setRequestHeader' in request) {
	        utils$1.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
	          request.setRequestHeader(key, val);
	        });
	      }

	      // Add withCredentials to request if needed
	      if (!utils$1.isUndefined(_config.withCredentials)) {
	        request.withCredentials = !!_config.withCredentials;
	      }

	      // Add responseType to request if needed
	      if (responseType && responseType !== 'json') {
	        request.responseType = _config.responseType;
	      }

	      // Handle progress if needed
	      if (onDownloadProgress) {
	        [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
	        request.addEventListener('progress', downloadThrottled);
	      }

	      // Not all browsers support upload events
	      if (onUploadProgress && request.upload) {
	        [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);

	        request.upload.addEventListener('progress', uploadThrottled);

	        request.upload.addEventListener('loadend', flushUpload);
	      }

	      if (_config.cancelToken || _config.signal) {
	        // Handle cancellation
	        // eslint-disable-next-line func-names
	        onCanceled = (cancel) => {
	          if (!request) {
	            return;
	          }
	          reject(!cancel || cancel.type ? new CanceledError$1(null, config, request) : cancel);
	          request.abort();
	          request = null;
	        };

	        _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
	        if (_config.signal) {
	          _config.signal.aborted
	            ? onCanceled()
	            : _config.signal.addEventListener('abort', onCanceled);
	        }
	      }

	      const protocol = parseProtocol(_config.url);

	      if (protocol && platform.protocols.indexOf(protocol) === -1) {
	        reject(
	          new AxiosError$1(
	            'Unsupported protocol ' + protocol + ':',
	            AxiosError$1.ERR_BAD_REQUEST,
	            config
	          )
	        );
	        return;
	      }

	      // Send the request
	      request.send(requestData || null);
	    });
	  };

	const composeSignals = (signals, timeout) => {
	  const { length } = (signals = signals ? signals.filter(Boolean) : []);

	  if (timeout || length) {
	    let controller = new AbortController();

	    let aborted;

	    const onabort = function (reason) {
	      if (!aborted) {
	        aborted = true;
	        unsubscribe();
	        const err = reason instanceof Error ? reason : this.reason;
	        controller.abort(
	          err instanceof AxiosError$1
	            ? err
	            : new CanceledError$1(err instanceof Error ? err.message : err)
	        );
	      }
	    };

	    let timer =
	      timeout &&
	      setTimeout(() => {
	        timer = null;
	        onabort(new AxiosError$1(`timeout of ${timeout}ms exceeded`, AxiosError$1.ETIMEDOUT));
	      }, timeout);

	    const unsubscribe = () => {
	      if (signals) {
	        timer && clearTimeout(timer);
	        timer = null;
	        signals.forEach((signal) => {
	          signal.unsubscribe
	            ? signal.unsubscribe(onabort)
	            : signal.removeEventListener('abort', onabort);
	        });
	        signals = null;
	      }
	    };

	    signals.forEach((signal) => signal.addEventListener('abort', onabort));

	    const { signal } = controller;

	    signal.unsubscribe = () => utils$1.asap(unsubscribe);

	    return signal;
	  }
	};

	const streamChunk = function* (chunk, chunkSize) {
	  let len = chunk.byteLength;

	  if (len < chunkSize) {
	    yield chunk;
	    return;
	  }

	  let pos = 0;
	  let end;

	  while (pos < len) {
	    end = pos + chunkSize;
	    yield chunk.slice(pos, end);
	    pos = end;
	  }
	};

	const readBytes = async function* (iterable, chunkSize) {
	  for await (const chunk of readStream(iterable)) {
	    yield* streamChunk(chunk, chunkSize);
	  }
	};

	const readStream = async function* (stream) {
	  if (stream[Symbol.asyncIterator]) {
	    yield* stream;
	    return;
	  }

	  const reader = stream.getReader();
	  try {
	    for (;;) {
	      const { done, value } = await reader.read();
	      if (done) {
	        break;
	      }
	      yield value;
	    }
	  } finally {
	    await reader.cancel();
	  }
	};

	const trackStream = (stream, chunkSize, onProgress, onFinish) => {
	  const iterator = readBytes(stream, chunkSize);

	  let bytes = 0;
	  let done;
	  let _onFinish = (e) => {
	    if (!done) {
	      done = true;
	      onFinish && onFinish(e);
	    }
	  };

	  return new ReadableStream(
	    {
	      async pull(controller) {
	        try {
	          const { done, value } = await iterator.next();

	          if (done) {
	            _onFinish();
	            controller.close();
	            return;
	          }

	          let len = value.byteLength;
	          if (onProgress) {
	            let loadedBytes = (bytes += len);
	            onProgress(loadedBytes);
	          }
	          controller.enqueue(new Uint8Array(value));
	        } catch (err) {
	          _onFinish(err);
	          throw err;
	        }
	      },
	      cancel(reason) {
	        _onFinish(reason);
	        return iterator.return();
	      },
	    },
	    {
	      highWaterMark: 2,
	    }
	  );
	};

	const DEFAULT_CHUNK_SIZE = 64 * 1024;

	const { isFunction } = utils$1;

	const globalFetchAPI = (({ Request, Response }) => ({
	  Request,
	  Response,
	}))(utils$1.global);

	const { ReadableStream: ReadableStream$1, TextEncoder } = utils$1.global;

	const test = (fn, ...args) => {
	  try {
	    return !!fn(...args);
	  } catch (e) {
	    return false;
	  }
	};

	const factory = (env) => {
	  env = utils$1.merge.call(
	    {
	      skipUndefined: true,
	    },
	    globalFetchAPI,
	    env
	  );

	  const { fetch: envFetch, Request, Response } = env;
	  const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === 'function';
	  const isRequestSupported = isFunction(Request);
	  const isResponseSupported = isFunction(Response);

	  if (!isFetchSupported) {
	    return false;
	  }

	  const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream$1);

	  const encodeText =
	    isFetchSupported &&
	    (typeof TextEncoder === 'function'
	      ? (
	          (encoder) => (str) =>
	            encoder.encode(str)
	        )(new TextEncoder())
	      : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));

	  const supportsRequestStream =
	    isRequestSupported &&
	    isReadableStreamSupported &&
	    test(() => {
	      let duplexAccessed = false;

	      const hasContentType = new Request(platform.origin, {
	        body: new ReadableStream$1(),
	        method: 'POST',
	        get duplex() {
	          duplexAccessed = true;
	          return 'half';
	        },
	      }).headers.has('Content-Type');

	      return duplexAccessed && !hasContentType;
	    });

	  const supportsResponseStream =
	    isResponseSupported &&
	    isReadableStreamSupported &&
	    test(() => utils$1.isReadableStream(new Response('').body));

	  const resolvers = {
	    stream: supportsResponseStream && ((res) => res.body),
	  };

	  isFetchSupported &&
	    (() => {
	      ['text', 'arrayBuffer', 'blob', 'formData', 'stream'].forEach((type) => {
	        !resolvers[type] &&
	          (resolvers[type] = (res, config) => {
	            let method = res && res[type];

	            if (method) {
	              return method.call(res);
	            }

	            throw new AxiosError$1(
	              `Response type '${type}' is not supported`,
	              AxiosError$1.ERR_NOT_SUPPORT,
	              config
	            );
	          });
	      });
	    })();

	  const getBodyLength = async (body) => {
	    if (body == null) {
	      return 0;
	    }

	    if (utils$1.isBlob(body)) {
	      return body.size;
	    }

	    if (utils$1.isSpecCompliantForm(body)) {
	      const _request = new Request(platform.origin, {
	        method: 'POST',
	        body,
	      });
	      return (await _request.arrayBuffer()).byteLength;
	    }

	    if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
	      return body.byteLength;
	    }

	    if (utils$1.isURLSearchParams(body)) {
	      body = body + '';
	    }

	    if (utils$1.isString(body)) {
	      return (await encodeText(body)).byteLength;
	    }
	  };

	  const resolveBodyLength = async (headers, body) => {
	    const length = utils$1.toFiniteNumber(headers.getContentLength());

	    return length == null ? getBodyLength(body) : length;
	  };

	  return async (config) => {
	    let {
	      url,
	      method,
	      data,
	      signal,
	      cancelToken,
	      timeout,
	      onDownloadProgress,
	      onUploadProgress,
	      responseType,
	      headers,
	      withCredentials = 'same-origin',
	      fetchOptions,
	    } = resolveConfig(config);

	    let _fetch = envFetch || fetch;

	    responseType = responseType ? (responseType + '').toLowerCase() : 'text';

	    let composedSignal = composeSignals(
	      [signal, cancelToken && cancelToken.toAbortSignal()],
	      timeout
	    );

	    let request = null;

	    const unsubscribe =
	      composedSignal &&
	      composedSignal.unsubscribe &&
	      (() => {
	        composedSignal.unsubscribe();
	      });

	    let requestContentLength;

	    try {
	      if (
	        onUploadProgress &&
	        supportsRequestStream &&
	        method !== 'get' &&
	        method !== 'head' &&
	        (requestContentLength = await resolveBodyLength(headers, data)) !== 0
	      ) {
	        let _request = new Request(url, {
	          method: 'POST',
	          body: data,
	          duplex: 'half',
	        });

	        let contentTypeHeader;

	        if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get('content-type'))) {
	          headers.setContentType(contentTypeHeader);
	        }

	        if (_request.body) {
	          const [onProgress, flush] = progressEventDecorator(
	            requestContentLength,
	            progressEventReducer(asyncDecorator(onUploadProgress))
	          );

	          data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
	        }
	      }

	      if (!utils$1.isString(withCredentials)) {
	        withCredentials = withCredentials ? 'include' : 'omit';
	      }

	      // Cloudflare Workers throws when credentials are defined
	      // see https://github.com/cloudflare/workerd/issues/902
	      const isCredentialsSupported = isRequestSupported && 'credentials' in Request.prototype;

	      const resolvedOptions = {
	        ...fetchOptions,
	        signal: composedSignal,
	        method: method.toUpperCase(),
	        headers: headers.normalize().toJSON(),
	        body: data,
	        duplex: 'half',
	        credentials: isCredentialsSupported ? withCredentials : undefined,
	      };

	      request = isRequestSupported && new Request(url, resolvedOptions);

	      let response = await (isRequestSupported
	        ? _fetch(request, fetchOptions)
	        : _fetch(url, resolvedOptions));

	      const isStreamResponse =
	        supportsResponseStream && (responseType === 'stream' || responseType === 'response');

	      if (supportsResponseStream && (onDownloadProgress || (isStreamResponse && unsubscribe))) {
	        const options = {};

	        ['status', 'statusText', 'headers'].forEach((prop) => {
	          options[prop] = response[prop];
	        });

	        const responseContentLength = utils$1.toFiniteNumber(response.headers.get('content-length'));

	        const [onProgress, flush] =
	          (onDownloadProgress &&
	            progressEventDecorator(
	              responseContentLength,
	              progressEventReducer(asyncDecorator(onDownloadProgress), true)
	            )) ||
	          [];

	        response = new Response(
	          trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
	            flush && flush();
	            unsubscribe && unsubscribe();
	          }),
	          options
	        );
	      }

	      responseType = responseType || 'text';

	      let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || 'text'](
	        response,
	        config
	      );

	      !isStreamResponse && unsubscribe && unsubscribe();

	      return await new Promise((resolve, reject) => {
	        settle(resolve, reject, {
	          data: responseData,
	          headers: AxiosHeaders$1.from(response.headers),
	          status: response.status,
	          statusText: response.statusText,
	          config,
	          request,
	        });
	      });
	    } catch (err) {
	      unsubscribe && unsubscribe();

	      if (err && err.name === 'TypeError' && /Load failed|fetch/i.test(err.message)) {
	        throw Object.assign(
	          new AxiosError$1(
	            'Network Error',
	            AxiosError$1.ERR_NETWORK,
	            config,
	            request,
	            err && err.response
	          ),
	          {
	            cause: err.cause || err,
	          }
	        );
	      }

	      throw AxiosError$1.from(err, err && err.code, config, request, err && err.response);
	    }
	  };
	};

	const seedCache = new Map();

	const getFetch = (config) => {
	  let env = (config && config.env) || {};
	  const { fetch, Request, Response } = env;
	  const seeds = [Request, Response, fetch];

	  let len = seeds.length,
	    i = len,
	    seed,
	    target,
	    map = seedCache;

	  while (i--) {
	    seed = seeds[i];
	    target = map.get(seed);

	    target === undefined && map.set(seed, (target = i ? new Map() : factory(env)));

	    map = target;
	  }

	  return target;
	};

	getFetch();

	/**
	 * Known adapters mapping.
	 * Provides environment-specific adapters for Axios:
	 * - `http` for Node.js
	 * - `xhr` for browsers
	 * - `fetch` for fetch API-based requests
	 *
	 * @type {Object<string, Function|Object>}
	 */
	const knownAdapters = {
	  http: httpAdapter,
	  xhr: xhrAdapter,
	  fetch: {
	    get: getFetch,
	  },
	};

	// Assign adapter names for easier debugging and identification
	utils$1.forEach(knownAdapters, (fn, value) => {
	  if (fn) {
	    try {
	      Object.defineProperty(fn, 'name', { value });
	    } catch (e) {
	      // eslint-disable-next-line no-empty
	    }
	    Object.defineProperty(fn, 'adapterName', { value });
	  }
	});

	/**
	 * Render a rejection reason string for unknown or unsupported adapters
	 *
	 * @param {string} reason
	 * @returns {string}
	 */
	const renderReason = (reason) => `- ${reason}`;

	/**
	 * Check if the adapter is resolved (function, null, or false)
	 *
	 * @param {Function|null|false} adapter
	 * @returns {boolean}
	 */
	const isResolvedHandle = (adapter) =>
	  utils$1.isFunction(adapter) || adapter === null || adapter === false;

	/**
	 * Get the first suitable adapter from the provided list.
	 * Tries each adapter in order until a supported one is found.
	 * Throws an AxiosError if no adapter is suitable.
	 *
	 * @param {Array<string|Function>|string|Function} adapters - Adapter(s) by name or function.
	 * @param {Object} config - Axios request configuration
	 * @throws {AxiosError} If no suitable adapter is available
	 * @returns {Function} The resolved adapter function
	 */
	function getAdapter$1(adapters, config) {
	  adapters = utils$1.isArray(adapters) ? adapters : [adapters];

	  const { length } = adapters;
	  let nameOrAdapter;
	  let adapter;

	  const rejectedReasons = {};

	  for (let i = 0; i < length; i++) {
	    nameOrAdapter = adapters[i];
	    let id;

	    adapter = nameOrAdapter;

	    if (!isResolvedHandle(nameOrAdapter)) {
	      adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];

	      if (adapter === undefined) {
	        throw new AxiosError$1(`Unknown adapter '${id}'`);
	      }
	    }

	    if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) {
	      break;
	    }

	    rejectedReasons[id || '#' + i] = adapter;
	  }

	  if (!adapter) {
	    const reasons = Object.entries(rejectedReasons).map(
	      ([id, state]) =>
	        `adapter ${id} ` +
	        (state === false ? 'is not supported by the environment' : 'is not available in the build')
	    );

	    let s = length
	      ? reasons.length > 1
	        ? 'since :\n' + reasons.map(renderReason).join('\n')
	        : ' ' + renderReason(reasons[0])
	      : 'as no adapter specified';

	    throw new AxiosError$1(
	      `There is no suitable adapter to dispatch the request ` + s,
	      'ERR_NOT_SUPPORT'
	    );
	  }

	  return adapter;
	}

	/**
	 * Exports Axios adapters and utility to resolve an adapter
	 */
	var adapters = {
	  /**
	   * Resolve an adapter from a list of adapter names or functions.
	   * @type {Function}
	   */
	  getAdapter: getAdapter$1,

	  /**
	   * Exposes all known adapters
	   * @type {Object<string, Function|Object>}
	   */
	  adapters: knownAdapters,
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
	    throw new CanceledError$1(null, config);
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
	  config.data = transformData.call(config, config.transformRequest);

	  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
	    config.headers.setContentType('application/x-www-form-urlencoded', false);
	  }

	  const adapter = adapters.getAdapter(config.adapter || defaults.adapter, config);

	  return adapter(config).then(
	    function onAdapterResolution(response) {
	      throwIfCancellationRequested(config);

	      // Transform response data
	      response.data = transformData.call(config, config.transformResponse, response);

	      response.headers = AxiosHeaders$1.from(response.headers);

	      return response;
	    },
	    function onAdapterRejection(reason) {
	      if (!isCancel$1(reason)) {
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
	    }
	  );
	}

	const VERSION$1 = "1.13.6";

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
	    return (
	      '[Axios v' +
	      VERSION$1 +
	      "] Transitional option '" +
	      opt +
	      "'" +
	      desc +
	      (message ? '. ' + message : '')
	    );
	  }

	  // eslint-disable-next-line func-names
	  return (value, opt, opts) => {
	    if (validator === false) {
	      throw new AxiosError$1(
	        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
	        AxiosError$1.ERR_DEPRECATED
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

	validators$1.spelling = function spelling(correctSpelling) {
	  return (value, opt) => {
	    // eslint-disable-next-line no-console
	    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
	    return true;
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
	    throw new AxiosError$1('options must be an object', AxiosError$1.ERR_BAD_OPTION_VALUE);
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
	        throw new AxiosError$1(
	          'option ' + opt + ' must be ' + result,
	          AxiosError$1.ERR_BAD_OPTION_VALUE
	        );
	      }
	      continue;
	    }
	    if (allowUnknown !== true) {
	      throw new AxiosError$1('Unknown option ' + opt, AxiosError$1.ERR_BAD_OPTION);
	    }
	  }
	}

	var validator = {
	  assertOptions,
	  validators: validators$1,
	};

	const validators = validator.validators;

	/**
	 * Create a new instance of Axios
	 *
	 * @param {Object} instanceConfig The default config for the instance
	 *
	 * @return {Axios} A new instance of Axios
	 */
	let Axios$1 = class Axios {
	  constructor(instanceConfig) {
	    this.defaults = instanceConfig || {};
	    this.interceptors = {
	      request: new InterceptorManager(),
	      response: new InterceptorManager(),
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
	  async request(configOrUrl, config) {
	    try {
	      return await this._request(configOrUrl, config);
	    } catch (err) {
	      if (err instanceof Error) {
	        let dummy = {};

	        Error.captureStackTrace ? Error.captureStackTrace(dummy) : (dummy = new Error());

	        // slice off the Error: ... line
	        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, '') : '';
	        try {
	          if (!err.stack) {
	            err.stack = stack;
	            // match without the 2 top stack lines
	          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ''))) {
	            err.stack += '\n' + stack;
	          }
	        } catch (e) {
	          // ignore the case where "stack" is an un-writable property
	        }
	      }

	      throw err;
	    }
	  }

	  _request(configOrUrl, config) {
	    /*eslint no-param-reassign:0*/
	    // Allow for axios('example/url'[, config]) a la fetch API
	    if (typeof configOrUrl === 'string') {
	      config = config || {};
	      config.url = configOrUrl;
	    } else {
	      config = configOrUrl || {};
	    }

	    config = mergeConfig$1(this.defaults, config);

	    const { transitional, paramsSerializer, headers } = config;

	    if (transitional !== undefined) {
	      validator.assertOptions(
	        transitional,
	        {
	          silentJSONParsing: validators.transitional(validators.boolean),
	          forcedJSONParsing: validators.transitional(validators.boolean),
	          clarifyTimeoutError: validators.transitional(validators.boolean),
	          legacyInterceptorReqResOrdering: validators.transitional(validators.boolean),
	        },
	        false
	      );
	    }

	    if (paramsSerializer != null) {
	      if (utils$1.isFunction(paramsSerializer)) {
	        config.paramsSerializer = {
	          serialize: paramsSerializer,
	        };
	      } else {
	        validator.assertOptions(
	          paramsSerializer,
	          {
	            encode: validators.function,
	            serialize: validators.function,
	          },
	          true
	        );
	      }
	    }

	    // Set config.allowAbsoluteUrls
	    if (config.allowAbsoluteUrls !== undefined) ; else if (this.defaults.allowAbsoluteUrls !== undefined) {
	      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
	    } else {
	      config.allowAbsoluteUrls = true;
	    }

	    validator.assertOptions(
	      config,
	      {
	        baseUrl: validators.spelling('baseURL'),
	        withXsrfToken: validators.spelling('withXSRFToken'),
	      },
	      true
	    );

	    // Set config.method
	    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

	    // Flatten headers
	    let contextHeaders = headers && utils$1.merge(headers.common, headers[config.method]);

	    headers &&
	      utils$1.forEach(['delete', 'get', 'head', 'post', 'put', 'patch', 'common'], (method) => {
	        delete headers[method];
	      });

	    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

	    // filter out skipped interceptors
	    const requestInterceptorChain = [];
	    let synchronousRequestInterceptors = true;
	    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
	      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
	        return;
	      }

	      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

	      const transitional = config.transitional || transitionalDefaults;
	      const legacyInterceptorReqResOrdering =
	        transitional && transitional.legacyInterceptorReqResOrdering;

	      if (legacyInterceptorReqResOrdering) {
	        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
	      } else {
	        requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
	      }
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
	      chain.unshift(...requestInterceptorChain);
	      chain.push(...responseInterceptorChain);
	      len = chain.length;

	      promise = Promise.resolve(config);

	      while (i < len) {
	        promise = promise.then(chain[i++], chain[i++]);
	      }

	      return promise;
	    }

	    len = requestInterceptorChain.length;

	    let newConfig = config;

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
	    config = mergeConfig$1(this.defaults, config);
	    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
	    return buildURL(fullPath, config.params, config.paramsSerializer);
	  }
	};

	// Provide aliases for supported request methods
	utils$1.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
	  /*eslint func-names:0*/
	  Axios$1.prototype[method] = function (url, config) {
	    return this.request(
	      mergeConfig$1(config || {}, {
	        method,
	        url,
	        data: (config || {}).data,
	      })
	    );
	  };
	});

	utils$1.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
	  /*eslint func-names:0*/

	  function generateHTTPMethod(isForm) {
	    return function httpMethod(url, data, config) {
	      return this.request(
	        mergeConfig$1(config || {}, {
	          method,
	          headers: isForm
	            ? {
	                'Content-Type': 'multipart/form-data',
	              }
	            : {},
	          url,
	          data,
	        })
	      );
	    };
	  }

	  Axios$1.prototype[method] = generateHTTPMethod();

	  Axios$1.prototype[method + 'Form'] = generateHTTPMethod(true);
	});

	/**
	 * A `CancelToken` is an object that can be used to request cancellation of an operation.
	 *
	 * @param {Function} executor The executor function.
	 *
	 * @returns {CancelToken}
	 */
	let CancelToken$1 = class CancelToken {
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
	    this.promise.then((cancel) => {
	      if (!token._listeners) return;

	      let i = token._listeners.length;

	      while (i-- > 0) {
	        token._listeners[i](cancel);
	      }
	      token._listeners = null;
	    });

	    // eslint-disable-next-line func-names
	    this.promise.then = (onfulfilled) => {
	      let _resolve;
	      // eslint-disable-next-line func-names
	      const promise = new Promise((resolve) => {
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

	      token.reason = new CanceledError$1(message, config, request);
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

	  toAbortSignal() {
	    const controller = new AbortController();

	    const abort = (err) => {
	      controller.abort(err);
	    };

	    this.subscribe(abort);

	    controller.signal.unsubscribe = () => this.unsubscribe(abort);

	    return controller.signal;
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
	      cancel,
	    };
	  }
	};

	/**
	 * Syntactic sugar for invoking a function and expanding an array for arguments.
	 *
	 * Common use case would be to use `Function.prototype.apply`.
	 *
	 *  ```js
	 *  function f(x, y, z) {}
	 *  const args = [1, 2, 3];
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
	function spread$1(callback) {
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
	function isAxiosError$1(payload) {
	  return utils$1.isObject(payload) && payload.isAxiosError === true;
	}

	const HttpStatusCode$1 = {
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
	  WebServerIsDown: 521,
	  ConnectionTimedOut: 522,
	  OriginIsUnreachable: 523,
	  TimeoutOccurred: 524,
	  SslHandshakeFailed: 525,
	  InvalidSslCertificate: 526,
	};

	Object.entries(HttpStatusCode$1).forEach(([key, value]) => {
	  HttpStatusCode$1[value] = key;
	});

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
	  utils$1.extend(instance, Axios$1.prototype, context, { allOwnKeys: true });

	  // Copy context to instance
	  utils$1.extend(instance, context, null, { allOwnKeys: true });

	  // Factory for creating new instances
	  instance.create = function create(instanceConfig) {
	    return createInstance(mergeConfig$1(defaultConfig, instanceConfig));
	  };

	  return instance;
	}

	// Create the default instance to be exported
	const axios = createInstance(defaults);

	// Expose Axios class to allow class inheritance
	axios.Axios = Axios$1;

	// Expose Cancel & CancelToken
	axios.CanceledError = CanceledError$1;
	axios.CancelToken = CancelToken$1;
	axios.isCancel = isCancel$1;
	axios.VERSION = VERSION$1;
	axios.toFormData = toFormData$1;

	// Expose AxiosError class
	axios.AxiosError = AxiosError$1;

	// alias for CanceledError for backward compatibility
	axios.Cancel = axios.CanceledError;

	// Expose all/spread
	axios.all = function all(promises) {
	  return Promise.all(promises);
	};

	axios.spread = spread$1;

	// Expose isAxiosError
	axios.isAxiosError = isAxiosError$1;

	// Expose mergeConfig
	axios.mergeConfig = mergeConfig$1;

	axios.AxiosHeaders = AxiosHeaders$1;

	axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);

	axios.getAdapter = adapters.getAdapter;

	axios.HttpStatusCode = HttpStatusCode$1;

	axios.default = axios;

	// This module is intended to unwrap Axios default export as named.
	// Keep top-level export same with static properties
	// so that it can keep same with es module or cjs
	const {
	  Axios,
	  AxiosError,
	  CanceledError,
	  isCancel,
	  CancelToken,
	  VERSION,
	  all,
	  Cancel,
	  isAxiosError,
	  spread,
	  toFormData,
	  AxiosHeaders,
	  HttpStatusCode,
	  formToJSON,
	  getAdapter,
	  mergeConfig,
	} = axios;

	const CACHE_TTL$1 = 30 * 60 * 1000; // 30 minutes in-memory cache
	const cache$1 = new Map(); // name → { data, ts }

	const client$1 = axios.create({
		baseURL: "https://registry.npmjs.org/",
		timeout: 10000,
	});

	/**
	 * Fetch the latest package info from npm registry with in-memory caching.
	 */
	const getPackageInfo = async (packageName) => {
		const hit = cache$1.get(packageName);
		if (hit && Date.now() - hit.ts < CACHE_TTL$1) return hit.data;

		const { data } = await client$1.get(`/${encodeURIComponent(packageName)}/latest`);
		cache$1.set(packageName, { data, ts: Date.now() });
		return data;
	};

	/**
	 * Fetch info for many packages concurrently (default 8 at a time).
	 * Calls onResult(name, data | null) as each response arrives so the UI
	 * can update incrementally rather than waiting for all requests to finish.
	 */
	const fetchPackagesInfo = async (names, onResult, concurrency = 8) => {
		const queue = [...names];

		const worker = async () => {
			while (queue.length > 0) {
				const name = queue.shift();
				if (!name) break;
				try {
					const data = await getPackageInfo(name);
					onResult(name, data);
				} catch {
					onResult(name, null);
				}
			}
		};

		await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, worker));
	};

	PackageEditor[FILENAME] = 'src/components/PackageEditor.svelte';

	var root_1$1 = add_locations(from_html(`<span class="meta__dot svelte-1awhm8x">·</span> <span class="meta__name svelte-1awhm8x"> </span>`, 1), PackageEditor[FILENAME], [[152, 4], [153, 4]]);
	var root_2$2 = add_locations(from_html(`<span class="meta__version svelte-1awhm8x"> </span>`), PackageEditor[FILENAME], [[156, 4]]);
	var root_4$2 = add_locations(from_html(`<span class="spin svelte-1awhm8x"></span> Installing…`, 1), PackageEditor[FILENAME], [[167, 6]]);
	var root_5$2 = add_locations(from_svg(`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><path d="M8 2v8M5 7l3 3 3-3M3 12h10"></path></svg> `, 1), PackageEditor[FILENAME], [[169, 6, [[175, 19]]]]);
	var root_3$1 = add_locations(from_html(`<button class="install-btn svelte-1awhm8x"><!></button>`), PackageEditor[FILENAME], [[161, 4]]);
	var root_6$1 = add_locations(from_html(`<span class="stat stat--loading svelte-1awhm8x"><span class="spin svelte-1awhm8x"></span> </span>`), PackageEditor[FILENAME], [[182, 4, [[183, 5]]]]);
	var root_7$1 = add_locations(from_html(`<span class="stat stat--warn svelte-1awhm8x"> </span>`), PackageEditor[FILENAME], [[187, 4]]);
	var root_8$1 = add_locations(from_html(`<span class="stat stat--ok svelte-1awhm8x">All up to date</span>`), PackageEditor[FILENAME], [[189, 4]]);
	var root_9$1 = add_locations(from_html(`<div class="line svelte-1awhm8x"><span class="tok-key svelte-1awhm8x">&nbsp;&nbsp;"name"</span><span class="tok-colon svelte-1awhm8x">:</span><span class="tok-str svelte-1awhm8x"> </span><span class="tok-comma svelte-1awhm8x">,</span></div>`), PackageEditor[FILENAME], [[198, 17, [[199, 5], [199, 52], [201, 12], [201, 53]]]]);
	var root_10$1 = add_locations(from_html(`<div class="line svelte-1awhm8x"><span class="tok-key svelte-1awhm8x">&nbsp;&nbsp;"version"</span><span class="tok-colon svelte-1awhm8x">:</span><span class="tok-str svelte-1awhm8x"> </span><span class="tok-comma svelte-1awhm8x">,</span></div>`), PackageEditor[FILENAME], [[205, 20, [[206, 5], [206, 55], [209, 12], [209, 56]]]]);
	var root_11$1 = add_locations(from_html(`<div class="line svelte-1awhm8x"><span class="tok-key svelte-1awhm8x">&nbsp;&nbsp;"description"</span><span class="tok-colon svelte-1awhm8x">:</span><span class="tok-str svelte-1awhm8x"> </span><span class="tok-comma svelte-1awhm8x">,</span></div>`), PackageEditor[FILENAME], [[213, 24, [[214, 5], [214, 59], [217, 12], [217, 60]]]]);
	var root_14$1 = add_locations(from_html(`<span class="tok-comma svelte-1awhm8x">,</span>`), PackageEditor[FILENAME], [[234, 57]]);
	var root_15$1 = add_locations(from_html(`<span class="badge badge--loading svelte-1awhm8x"><span class="spin-sm svelte-1awhm8x"></span></span>`), PackageEditor[FILENAME], [[237, 48, [[239, 10]]]]);
	var root_16$1 = add_locations(from_html(`<span class="badge badge--ok svelte-1awhm8x"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" class="svelte-1awhm8x"><polyline points="13 4 6.5 11 3 7.5"></polyline></svg> </span>`), PackageEditor[FILENAME], [[240, 49, [[242, 10, [[247, 11]]]]]]);
	var root_17$1 = add_locations(from_html(`<button class="badge badge--update svelte-1awhm8x"> </button>`), PackageEditor[FILENAME], [[249, 53]]);
	var root_18$1 = add_locations(from_html(`<span class="badge badge--error svelte-1awhm8x">✕</span>`), PackageEditor[FILENAME], [[253, 16]]);
	var root_19$1 = add_locations(from_html(`<a class="link-icon svelte-1awhm8x" title="Homepage"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" class="svelte-1awhm8x"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 1.5A9.5 9.5 0 0 1 11 8 9.5 9.5 0 0 1 8 14.5M8 1.5A9.5 9.5 0 0 0 5 8 9.5 9.5 0 0 0 8 14.5M1.5 8h13"></path></svg></a>`), PackageEditor[FILENAME], [[254, 43, [[258, 10, [[263, 11], [263, 43]]]]]]);
	var root_20$1 = add_locations(from_html(`<a class="link-icon svelte-1awhm8x" title="Issues"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" class="svelte-1awhm8x"><circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="5.5" x2="8" y2="8.5"></line><line x1="8" y1="10.5" x2="8.01" y2="10.5"></line></svg></a>`), PackageEditor[FILENAME], [[276, 38, [[280, 10, [[285, 11], [285, 43], [290, 12]]]]]]);

	var root_13$1 = add_locations(from_html(`<div class="line pkg-line svelte-1awhm8x"><span class="tok-pkg svelte-1awhm8x"> </span><span class="tok-colon svelte-1awhm8x">:</span><span class="tok-ver svelte-1awhm8x"> </span><!><span class="pkg-status svelte-1awhm8x"><!><!><a class="link-icon svelte-1awhm8x" title="npm"><svg viewBox="0 0 16 16" fill="currentColor" class="svelte-1awhm8x"><path d="M0 5h16v6H8v1H5v-1H0zm1 1v4h3V7h1v3h1V6zm5 0v5h2V7h2v4h1V6zm5 0v4h1V7h1v3h1V6z"></path></svg></a><!></span></div>`), PackageEditor[FILENAME], [
		[
			229,
			5,
			[
				[230, 6],
				[230, 67],
				[233, 13],
				[236, 13, [[267, 14, [[271, 9, [[272, 10]]]]]]]
			]
		]
	]);

	var root_12$1 = add_locations(from_html(`<div class="line svelte-1awhm8x"><span class="tok-section svelte-1awhm8x">&nbsp;&nbsp;"dependencies"</span><span class="tok-colon svelte-1awhm8x">:</span><span class="tok-brace svelte-1awhm8x"></span></div> <!> <div class="line svelte-1awhm8x"><span class="tok-brace svelte-1awhm8x"></span><span class="tok-comma svelte-1awhm8x">,</span></div>`, 1), PackageEditor[FILENAME], [
		[222, 4, [[223, 5], [223, 64], [226, 12]]],
		[296, 4, [[297, 5], [297, 53]]]
	]);

	var root_23$1 = add_locations(from_html(`<span class="tok-comma svelte-1awhm8x">,</span>`), PackageEditor[FILENAME], [[315, 60]]);
	var root_24$1 = add_locations(from_html(`<span class="badge badge--loading svelte-1awhm8x"><span class="spin-sm svelte-1awhm8x"></span></span>`), PackageEditor[FILENAME], [[318, 48, [[320, 10]]]]);
	var root_25$1 = add_locations(from_html(`<span class="badge badge--ok svelte-1awhm8x"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" class="svelte-1awhm8x"><polyline points="13 4 6.5 11 3 7.5"></polyline></svg> </span>`), PackageEditor[FILENAME], [[321, 49, [[323, 10, [[328, 11]]]]]]);
	var root_26$1 = add_locations(from_html(`<button class="badge badge--update svelte-1awhm8x"> </button>`), PackageEditor[FILENAME], [[330, 53]]);
	var root_27$1 = add_locations(from_html(`<span class="badge badge--error svelte-1awhm8x">✕</span>`), PackageEditor[FILENAME], [[334, 16]]);
	var root_28$1 = add_locations(from_html(`<a class="link-icon svelte-1awhm8x" title="Homepage"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" class="svelte-1awhm8x"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 1.5A9.5 9.5 0 0 1 11 8 9.5 9.5 0 0 1 8 14.5M8 1.5A9.5 9.5 0 0 0 5 8 9.5 9.5 0 0 0 8 14.5M1.5 8h13"></path></svg></a>`), PackageEditor[FILENAME], [[335, 43, [[339, 10, [[344, 11], [344, 43]]]]]]);
	var root_29 = add_locations(from_html(`<a class="link-icon svelte-1awhm8x" title="Issues"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" class="svelte-1awhm8x"><circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="5.5" x2="8" y2="8.5"></line><line x1="8" y1="10.5" x2="8.01" y2="10.5"></line></svg></a>`), PackageEditor[FILENAME], [[357, 38, [[361, 10, [[366, 11], [366, 43], [371, 12]]]]]]);

	var root_22$1 = add_locations(from_html(`<div class="line pkg-line svelte-1awhm8x"><span class="tok-pkg svelte-1awhm8x"> </span><span class="tok-colon svelte-1awhm8x">:</span><span class="tok-ver tok-ver--dev svelte-1awhm8x"> </span><!><span class="pkg-status svelte-1awhm8x"><!><!><a class="link-icon svelte-1awhm8x" title="npm"><svg viewBox="0 0 16 16" fill="currentColor" class="svelte-1awhm8x"><path d="M0 5h16v6H8v1H5v-1H0zm1 1v4h3V7h1v3h1V6zm5 0v5h2V7h2v4h1V6zm5 0v4h1V7h1v3h1V6z"></path></svg></a><!></span></div>`), PackageEditor[FILENAME], [
		[
			310,
			5,
			[
				[311, 6],
				[311, 67],
				[314, 13],
				[317, 13, [[348, 14, [[352, 9, [[353, 10]]]]]]]
			]
		]
	]);

	var root_21$1 = add_locations(from_html(`<div class="line svelte-1awhm8x"><span class="tok-section svelte-1awhm8x">&nbsp;&nbsp;"devDependencies"</span><span class="tok-colon svelte-1awhm8x">:</span><span class="tok-brace svelte-1awhm8x"></span></div> <!> <div class="line svelte-1awhm8x"><span class="tok-brace svelte-1awhm8x"></span></div>`, 1), PackageEditor[FILENAME], [
		[303, 4, [[304, 5], [304, 67], [307, 12]]],
		[377, 4, [[377, 22]]]
	]);

	var root$3 = add_locations(from_html(`<div class="editor svelte-1awhm8x"><div class="editor__meta svelte-1awhm8x"><div class="editor__metaLeft svelte-1awhm8x"><span class="meta__filename svelte-1awhm8x">package.json</span> <!> <!></div> <div class="editor__metaRight svelte-1awhm8x"><!> <!> <span class="stat stat--total svelte-1awhm8x"> </span></div></div> <div class="editor__body svelte-1awhm8x"><div class="code svelte-1awhm8x"><div class="line svelte-1awhm8x"><span class="tok-brace svelte-1awhm8x"></span></div> <!> <!> <!> <!> <!> <div class="line svelte-1awhm8x"><span class="tok-brace svelte-1awhm8x"></span></div></div></div></div>`), PackageEditor[FILENAME], [
		[
			147,
			0,
			[
				[148, 1, [[149, 2, [[150, 3]]], [159, 2, [[191, 3]]]]],
				[
					195,
					1,
					[[196, 2, [[197, 3, [[197, 21]]], [379, 3, [[379, 21]]]]]]
				]
			]
		]
	]);

	function PackageEditor($$anchor, $$props) {
		check_target(new.target);
		push($$props, true);

		/**
		 * Props:
		 *   project   – { id, name, path }
		 *   rawJson   – raw string content of package.json
		 *   onRefresh – callback(newRawJson) called after a version update
		 */
		let onRefresh = prop($$props, 'onRefresh', 3, () => {});

		let pkg = tag(
			user_derived(() => {
				try {
					return JSON.parse($$props.rawJson);
				} catch {
					return {};
				}
			}),
			'pkg'
		);

		let infoMap = tag(state(proxy({})), 'infoMap');

		user_effect(() => {
			// Touch reactive deps
			$$props.rawJson;

			set(infoMap, {}, true);

			const allNames = [
				...Object.keys(get$1(pkg).dependencies ?? {}),
				...Object.keys(get$1(pkg).devDependencies ?? {})
			];

			if (strict_equals(allNames.length, 0)) return;

			const initial = {};

			for (const n of allNames) initial[n] = { status: "loading" };

			set(infoMap, initial, true);

			fetchPackagesInfo(allNames, (name, data) => {
				set(
					infoMap,
					{
						...get$1(infoMap),
						[name]: data
							? { status: data.version ? "fetched" : "error", ...data }
							: { status: "error" }
					},
					true
				);
			});
		});

		function getStatus(pkgName, currentRaw) {
			const info = get$1(infoMap)[pkgName];

			if (!info || strict_equals(info.status, "loading")) return "loading";
			if (strict_equals(info.status, "error")) return "error";

			const latest = info.version;

			if (!latest) return "error";

			const current = currentRaw.replace(/^[^\d]*/, "");

			return strict_equals(current, latest) ? "ok" : "update";
		}

		function getLatest(pkgName) {
			return get$1(infoMap)[pkgName]?.version ?? null;
		}

		async function handleUpdate(pkgName, latestVersion, isDev) {
			try {
				const updated = (await track_reactivity_loss(updatePackageVersion($$props.project.path, pkgName, latestVersion, isDev)))();

				toast.success(`Updated ${pkgName}`, { description: `→ ${updated}`, position: "bottom-center" });

				// Re-read file and notify parent so the editor view refreshes
				try {
					const newRaw = (await track_reactivity_loss(getProjectPackages($$props.project.path)))();

					onRefresh()(newRaw);
				} catch {
					/* ignore read error */
				}

				set(
					infoMap,
					{
						...get$1(infoMap),
						[pkgName]: { ...get$1(infoMap)[pkgName], status: "fetched" }
					},
					true
				);
			} catch(err) {
				toast.error(`Failed to update ${pkgName}`, { description: err.message, position: "bottom-center" });
			}
		}

		let stats = tag(
			user_derived(() => {
				let total = 0, outdated = 0, loading = 0;

				for (const [name, raw] of Object.entries(get$1(pkg).dependencies ?? {})) {
					total++;

					const s = getStatus(name, raw);

					if (strict_equals(s, "loading")) loading++;
					if (strict_equals(s, "update")) outdated++;
				}

				for (const [name, raw] of Object.entries(get$1(pkg).devDependencies ?? {})) {
					total++;

					const s = getStatus(name, raw);

					if (strict_equals(s, "loading")) loading++;
					if (strict_equals(s, "update")) outdated++;
				}

				return { total, outdated, loading };
			}),
			'stats'
		);

		let lockStatus = tag(state("ok" // "ok" | "stale" | "missing"
		), 'lockStatus');
		let installing = tag(state(false), 'installing');

		user_effect(() => {
			$$props.rawJson; // re-check when rawJson changes

			if ($$props.project?.path) {
				set(lockStatus, checkLockFile($$props.project.path), true);
			}
		});

		async function handleInstall() {
			set(installing, true);

			try {
				(await track_reactivity_loss(runInstall($$props.project.path)))();
				set(lockStatus, checkLockFile($$props.project.path), true);
				toast.success("Install complete", { position: "bottom-center" });
			} catch(err) {
				toast.error("Install failed", { description: err.message, position: "bottom-center" });
			} finally {
				set(installing, false);
			}
		}

		var $$exports = { ...legacy_api() };
		var div = root$3();
		var div_1 = child(div);
		var div_2 = child(div_1);
		var node = sibling(child(div_2), 2);

		{
			var consequent = ($$anchor) => {
				var fragment = root_1$1();
				var span = sibling(first_child(fragment), 2);
				var text = child(span);
				template_effect(() => set_text(text, get$1(pkg).name));
				append($$anchor, fragment);
			};

			add_svelte_meta(
				() => if_block(node, ($$render) => {
					if (get$1(pkg).name) $$render(consequent);
				}),
				'if',
				PackageEditor,
				151,
				3
			);
		}

		var node_1 = sibling(node, 2);

		{
			var consequent_1 = ($$anchor) => {
				var span_1 = root_2$2();
				var text_1 = child(span_1);
				template_effect(() => set_text(text_1, `v${get$1(pkg).version ?? ''}`));
				append($$anchor, span_1);
			};

			add_svelte_meta(
				() => if_block(node_1, ($$render) => {
					if (get$1(pkg).version) $$render(consequent_1);
				}),
				'if',
				PackageEditor,
				155,
				3
			);
		}

		var div_3 = sibling(div_2, 2);
		var node_2 = child(div_3);

		{
			var consequent_3 = ($$anchor) => {
				var button = root_3$1();
				var node_3 = child(button);

				{
					var consequent_2 = ($$anchor) => {
						var fragment_1 = root_4$2();
						append($$anchor, fragment_1);
					};

					var alternate = ($$anchor) => {
						var fragment_2 = root_5$2();
						var text_2 = sibling(first_child(fragment_2), 1, true);

						template_effect(() => set_text(text_2, strict_equals(get$1(lockStatus), "missing") ? "Install" : "Sync"));
						append($$anchor, fragment_2);
					};

					add_svelte_meta(
						() => if_block(node_3, ($$render) => {
							if (get$1(installing)) $$render(consequent_2); else $$render(alternate, -1);
						}),
						'if',
						PackageEditor,
						166,
						5
					);
				}
				template_effect(() => button.disabled = get$1(installing));
				delegated('click', button, handleInstall);
				append($$anchor, button);
			};

			add_svelte_meta(
				() => if_block(node_2, ($$render) => {
					if (strict_equals(get$1(lockStatus), "stale") || strict_equals(get$1(lockStatus), "missing")) $$render(consequent_3);
				}),
				'if',
				PackageEditor,
				160,
				3
			);
		}

		var node_4 = sibling(node_2, 2);

		{
			var consequent_4 = ($$anchor) => {
				var span_2 = root_6$1();
				var text_3 = sibling(child(span_2));
				template_effect(() => set_text(text_3, ` Checking ${get$1(stats).loading ?? ''}…`));
				append($$anchor, span_2);
			};

			var consequent_5 = ($$anchor) => {
				var span_3 = root_7$1();
				var text_4 = child(span_3);
				template_effect(() => set_text(text_4, `${get$1(stats).outdated ?? ''} outdated`));
				append($$anchor, span_3);
			};

			var alternate_1 = ($$anchor) => {
				var span_4 = root_8$1();

				append($$anchor, span_4);
			};

			add_svelte_meta(
				() => if_block(node_4, ($$render) => {
					if (get$1(stats).loading > 0) $$render(consequent_4); else if (get$1(stats).outdated > 0) $$render(consequent_5, 1); else $$render(alternate_1, -1);
				}),
				'if',
				PackageEditor,
				181,
				3
			);
		}

		var span_5 = sibling(node_4, 2);
		var text_5 = child(span_5);

		var div_4 = sibling(div_1, 2);
		var div_5 = child(div_4);
		var div_6 = child(div_5);
		var span_6 = child(div_6);

		span_6.textContent = '{';

		var node_5 = sibling(div_6, 2);

		{
			var consequent_6 = ($$anchor) => {
				var div_7 = root_9$1();
				var span_7 = sibling(child(div_7), 2);
				var text_6 = child(span_7);
				template_effect(() => set_text(text_6, `"${get$1(pkg).name ?? ''}"`));
				append($$anchor, div_7);
			};

			add_svelte_meta(
				() => if_block(node_5, ($$render) => {
					if (get$1(pkg).name) $$render(consequent_6);
				}),
				'if',
				PackageEditor,
				198,
				3
			);
		}

		var node_6 = sibling(node_5, 2);

		{
			var consequent_7 = ($$anchor) => {
				var div_8 = root_10$1();
				var span_8 = sibling(child(div_8), 2);
				var text_7 = child(span_8);
				template_effect(() => set_text(text_7, `"${get$1(pkg).version ?? ''}"`));
				append($$anchor, div_8);
			};

			add_svelte_meta(
				() => if_block(node_6, ($$render) => {
					if (get$1(pkg).version) $$render(consequent_7);
				}),
				'if',
				PackageEditor,
				205,
				3
			);
		}

		var node_7 = sibling(node_6, 2);

		{
			var consequent_8 = ($$anchor) => {
				var div_9 = root_11$1();
				var span_9 = sibling(child(div_9), 2);
				var text_8 = child(span_9);
				template_effect(() => set_text(text_8, `"${get$1(pkg).description ?? ''}"`));
				append($$anchor, div_9);
			};

			add_svelte_meta(
				() => if_block(node_7, ($$render) => {
					if (get$1(pkg).description) $$render(consequent_8);
				}),
				'if',
				PackageEditor,
				213,
				3
			);
		}

		var node_8 = sibling(node_7, 2);

		{
			var consequent_15 = ($$anchor) => {
				var fragment_3 = root_12$1();
				var div_10 = first_child(fragment_3);
				var span_10 = sibling(child(div_10), 2);

				span_10.textContent = '{';

				var node_9 = sibling(div_10, 2);

				add_svelte_meta(
					() => each(node_9, 17, () => Object.entries(get$1(pkg).dependencies), index, ($$anchor, $$item, i) => {
						var $$array = user_derived(() => to_array(get$1($$item), 2));
						let name = () => get$1($$array)[0];

						name();

						let ver = () => get$1($$array)[1];

						ver();

						var div_11 = root_13$1();
						var span_11 = child(div_11);
						var text_9 = child(span_11);

						reset(span_11);

						var span_12 = sibling(span_11, 2);
						var text_10 = child(span_12);

						reset(span_12);

						var node_10 = sibling(span_12);

						{
							var consequent_9 = ($$anchor) => {
								var span_13 = root_14$1();

								append($$anchor, span_13);
							};

							var d = user_derived(() => i < Object.keys(get$1(pkg).dependencies).length - 1);

							add_svelte_meta(
								() => if_block(node_10, ($$render) => {
									if (get$1(d)) $$render(consequent_9);
								}),
								'if',
								PackageEditor,
								234,
								7
							);
						}

						var span_14 = sibling(node_10);
						var node_11 = child(span_14);

						{
							var consequent_10 = ($$anchor) => {
								var span_15 = root_15$1();

								append($$anchor, span_15);
							};

							var d_1 = user_derived(() => strict_equals(getStatus(name(), ver()), "loading"));

							var consequent_11 = ($$anchor) => {
								var span_16 = root_16$1();
								var text_11 = sibling(child(span_16), 1, true);

								reset(span_16);
								template_effect(($0) => set_text(text_11, $0), [() => getLatest(name())]);
								append($$anchor, span_16);
							};

							var d_2 = user_derived(() => strict_equals(getStatus(name(), ver()), "ok"));

							var consequent_12 = ($$anchor) => {
								var button_1 = root_17$1();
								var text_12 = child(button_1);

								reset(button_1);
								template_effect(($0) => set_text(text_12, `↑ ${$0 ?? ''}`), [() => getLatest(name())]);

								delegated('click', button_1, function click() {
									return handleUpdate(name(), getLatest(name()), false);
								});

								append($$anchor, button_1);
							};

							var d_3 = user_derived(() => strict_equals(getStatus(name(), ver()), "update"));

							var alternate_2 = ($$anchor) => {
								var span_17 = root_18$1();

								append($$anchor, span_17);
							};

							add_svelte_meta(
								() => if_block(node_11, ($$render) => {
									if (get$1(d_1)) $$render(consequent_10); else if (get$1(d_2)) $$render(consequent_11, 1); else if (get$1(d_3)) $$render(consequent_12, 2); else $$render(alternate_2, -1);
								}),
								'if',
								PackageEditor,
								237,
								8
							);
						}

						var node_12 = sibling(node_11);

						{
							var consequent_13 = ($$anchor) => {
								var a = root_19$1();

								template_effect(() => set_attribute(a, 'href', get$1(infoMap)[name()].homepage));
								append($$anchor, a);
							};

							add_svelte_meta(
								() => if_block(node_12, ($$render) => {
									if (get$1(infoMap)[name()]?.homepage) $$render(consequent_13);
								}),
								'if',
								PackageEditor,
								254,
								14
							);
						}

						var a_1 = sibling(node_12);
						var node_13 = sibling(a_1);

						{
							var consequent_14 = ($$anchor) => {
								var a_2 = root_20$1();

								template_effect(() => set_attribute(a_2, 'href', get$1(infoMap)[name()].bugs.url));
								append($$anchor, a_2);
							};

							add_svelte_meta(
								() => if_block(node_13, ($$render) => {
									if (get$1(infoMap)[name()]?.bugs?.url) $$render(consequent_14);
								}),
								'if',
								PackageEditor,
								276,
								8
							);
						}

						reset(span_14);
						reset(div_11);

						template_effect(() => {
							set_text(text_9, `    "${name() ?? ''}"`);
							set_text(text_10, `"${ver() ?? ''}"`);
							set_attribute(a_1, 'href', `https://www.npmjs.com/package/${name()}`);
						});

						append($$anchor, div_11);
					}),
					'each',
					PackageEditor,
					228,
					4
				);

				var div_12 = sibling(node_9, 2);
				var span_18 = child(div_12);

				span_18.textContent = '  }';
				append($$anchor, fragment_3);
			};

			var d_4 = user_derived(() => get$1(pkg).dependencies && Object.keys(get$1(pkg).dependencies).length > 0);

			add_svelte_meta(
				() => if_block(node_8, ($$render) => {
					if (get$1(d_4)) $$render(consequent_15);
				}),
				'if',
				PackageEditor,
				221,
				3
			);
		}

		var node_14 = sibling(node_8, 2);

		{
			var consequent_22 = ($$anchor) => {
				var fragment_4 = root_21$1();
				var div_13 = first_child(fragment_4);
				var span_19 = sibling(child(div_13), 2);

				span_19.textContent = '{';

				var node_15 = sibling(div_13, 2);

				add_svelte_meta(
					() => each(node_15, 17, () => Object.entries(get$1(pkg).devDependencies), index, ($$anchor, $$item, i) => {
						var $$array_1 = user_derived(() => to_array(get$1($$item), 2));
						let name = () => get$1($$array_1)[0];

						name();

						let ver = () => get$1($$array_1)[1];

						ver();

						var div_14 = root_22$1();
						var span_20 = child(div_14);
						var text_13 = child(span_20);

						reset(span_20);

						var span_21 = sibling(span_20, 2);
						var text_14 = child(span_21);

						reset(span_21);

						var node_16 = sibling(span_21);

						{
							var consequent_16 = ($$anchor) => {
								var span_22 = root_23$1();

								append($$anchor, span_22);
							};

							var d_5 = user_derived(() => i < Object.keys(get$1(pkg).devDependencies).length - 1);

							add_svelte_meta(
								() => if_block(node_16, ($$render) => {
									if (get$1(d_5)) $$render(consequent_16);
								}),
								'if',
								PackageEditor,
								315,
								7
							);
						}

						var span_23 = sibling(node_16);
						var node_17 = child(span_23);

						{
							var consequent_17 = ($$anchor) => {
								var span_24 = root_24$1();

								append($$anchor, span_24);
							};

							var d_6 = user_derived(() => strict_equals(getStatus(name(), ver()), "loading"));

							var consequent_18 = ($$anchor) => {
								var span_25 = root_25$1();
								var text_15 = sibling(child(span_25), 1, true);

								reset(span_25);
								template_effect(($0) => set_text(text_15, $0), [() => getLatest(name())]);
								append($$anchor, span_25);
							};

							var d_7 = user_derived(() => strict_equals(getStatus(name(), ver()), "ok"));

							var consequent_19 = ($$anchor) => {
								var button_2 = root_26$1();
								var text_16 = child(button_2);

								reset(button_2);
								template_effect(($0) => set_text(text_16, `↑ ${$0 ?? ''}`), [() => getLatest(name())]);

								delegated('click', button_2, function click_1() {
									return handleUpdate(name(), getLatest(name()), true);
								});

								append($$anchor, button_2);
							};

							var d_8 = user_derived(() => strict_equals(getStatus(name(), ver()), "update"));

							var alternate_3 = ($$anchor) => {
								var span_26 = root_27$1();

								append($$anchor, span_26);
							};

							add_svelte_meta(
								() => if_block(node_17, ($$render) => {
									if (get$1(d_6)) $$render(consequent_17); else if (get$1(d_7)) $$render(consequent_18, 1); else if (get$1(d_8)) $$render(consequent_19, 2); else $$render(alternate_3, -1);
								}),
								'if',
								PackageEditor,
								318,
								8
							);
						}

						var node_18 = sibling(node_17);

						{
							var consequent_20 = ($$anchor) => {
								var a_3 = root_28$1();

								template_effect(() => set_attribute(a_3, 'href', get$1(infoMap)[name()].homepage));
								append($$anchor, a_3);
							};

							add_svelte_meta(
								() => if_block(node_18, ($$render) => {
									if (get$1(infoMap)[name()]?.homepage) $$render(consequent_20);
								}),
								'if',
								PackageEditor,
								335,
								14
							);
						}

						var a_4 = sibling(node_18);
						var node_19 = sibling(a_4);

						{
							var consequent_21 = ($$anchor) => {
								var a_5 = root_29();

								template_effect(() => set_attribute(a_5, 'href', get$1(infoMap)[name()].bugs.url));
								append($$anchor, a_5);
							};

							add_svelte_meta(
								() => if_block(node_19, ($$render) => {
									if (get$1(infoMap)[name()]?.bugs?.url) $$render(consequent_21);
								}),
								'if',
								PackageEditor,
								357,
								8
							);
						}

						reset(span_23);
						reset(div_14);

						template_effect(() => {
							set_text(text_13, `    "${name() ?? ''}"`);
							set_text(text_14, `"${ver() ?? ''}"`);
							set_attribute(a_4, 'href', `https://www.npmjs.com/package/${name()}`);
						});

						append($$anchor, div_14);
					}),
					'each',
					PackageEditor,
					309,
					4
				);

				var div_15 = sibling(node_15, 2);
				var span_27 = child(div_15);

				span_27.textContent = '  }';
				append($$anchor, fragment_4);
			};

			var d_9 = user_derived(() => get$1(pkg).devDependencies && Object.keys(get$1(pkg).devDependencies).length > 0);

			add_svelte_meta(
				() => if_block(node_14, ($$render) => {
					if (get$1(d_9)) $$render(consequent_22);
				}),
				'if',
				PackageEditor,
				302,
				3
			);
		}

		var div_16 = sibling(node_14, 2);
		var span_28 = child(div_16);

		span_28.textContent = '}';
		template_effect(() => set_text(text_5, `${get$1(stats).total ?? ''} packages`));
		append($$anchor, div);

		return pop($$exports);
	}

	delegate(['click']);

	const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
	const cache = new Map(); // name → { data, ts }

	const client = axios.create({
		baseURL: "https://packagist.org/",
		timeout: 10000,
	});

	/**
	 * Compare two Composer normalized version strings (e.g. "1.2.3.0").
	 * Returns negative if a < b, positive if a > b, 0 if equal.
	 */
	function compareNormalized(a, b) {
		const ap = a.split(".").map(Number);
		const bp = b.split(".").map(Number);
		for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
			const diff = (ap[i] || 0) - (bp[i] || 0);
			if (diff !== 0) return diff;
		}
		return 0;
	}

	/**
	 * Given the versions map from Packagist, return the latest stable version string.
	 * Filters out dev, alpha, beta, RC releases.
	 */
	function resolveLatestStable(versions) {
		const stable = Object.entries(versions)
			.filter(([key]) => {
				const lower = key.toLowerCase();
				return (
					!lower.startsWith("dev-") &&
					!lower.endsWith("-dev") &&
					!lower.includes("alpha") &&
					!lower.includes("beta") &&
					!lower.includes("-rc") &&
					key !== "dev-master"
				);
			})
			.map(([, data]) => data)
			.sort((a, b) =>
				compareNormalized(
					a.version_normalized || "0.0.0.0",
					b.version_normalized || "0.0.0.0",
				),
			);

		return stable[stable.length - 1] ?? null;
	}

	/**
	 * Fetch the latest stable package info from Packagist with in-memory caching.
	 * Returns { version, homepage, repository } or throws on failure.
	 */
	const getComposerPackageInfo = async (packageName) => {
		const hit = cache.get(packageName);
		if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

		const { data } = await client.get(
			`/packages/${encodeURIComponent(packageName)}.json`,
		);
		const latest = resolveLatestStable(data.package?.versions ?? {});
		if (!latest) throw new Error(`No stable version found for ${packageName}`);

		const result = {
			version: latest.version,
			homepage: latest.homepage || data.package?.repository || null,
			repository: data.package?.repository || null,
		};

		cache.set(packageName, { data: result, ts: Date.now() });
		return result;
	};

	/**
	 * Fetch info for many Composer packages concurrently (default 6 at a time).
	 * Calls onResult(name, data | null) as each response arrives.
	 */
	const fetchComposerPackagesInfo = async (
		names,
		onResult,
		concurrency = 6,
	) => {
		const queue = [...names];

		const worker = async () => {
			while (queue.length > 0) {
				const name = queue.shift();
				if (!name) break;
				try {
					const data = await getComposerPackageInfo(name);
					onResult(name, data);
				} catch {
					onResult(name, null);
				}
			}
		};

		await Promise.all(
			Array.from({ length: Math.min(concurrency, names.length) }, worker),
		);
	};

	ComposerEditor[FILENAME] = 'src/components/ComposerEditor.svelte';

	var root_1 = add_locations(from_html(`<span class="meta__dot svelte-1lxqddh">·</span> <span class="meta__name svelte-1lxqddh"> </span>`, 1), ComposerEditor[FILENAME], [[160, 4], [161, 4]]);
	var root_2$1 = add_locations(from_html(`<span class="meta__version svelte-1lxqddh"> </span>`), ComposerEditor[FILENAME], [[164, 4]]);
	var root_4$1 = add_locations(from_html(`<span class="spin svelte-1lxqddh"></span> Installing…`, 1), ComposerEditor[FILENAME], [[175, 6]]);
	var root_5$1 = add_locations(from_svg(`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><path d="M8 2v8M5 7l3 3 3-3M3 12h10"></path></svg> `, 1), ComposerEditor[FILENAME], [[177, 6, [[183, 19]]]]);
	var root_3 = add_locations(from_html(`<button class="install-btn svelte-1lxqddh"><!></button>`), ComposerEditor[FILENAME], [[169, 4]]);
	var root_6 = add_locations(from_html(`<span class="stat stat--loading svelte-1lxqddh"><span class="spin svelte-1lxqddh"></span> </span>`), ComposerEditor[FILENAME], [[190, 4, [[191, 5]]]]);
	var root_7 = add_locations(from_html(`<span class="stat stat--warn svelte-1lxqddh"> </span>`), ComposerEditor[FILENAME], [[195, 4]]);
	var root_8 = add_locations(from_html(`<span class="stat stat--ok svelte-1lxqddh">All up to date</span>`), ComposerEditor[FILENAME], [[197, 4]]);
	var root_9 = add_locations(from_html(`<div class="line svelte-1lxqddh"><span class="tok-key svelte-1lxqddh">&nbsp;&nbsp;"name"</span><span class="tok-colon svelte-1lxqddh">:</span><span class="tok-str svelte-1lxqddh"> </span><span class="tok-comma svelte-1lxqddh">,</span></div>`), ComposerEditor[FILENAME], [[207, 22, [[208, 5], [208, 52], [210, 12], [210, 58]]]]);
	var root_10 = add_locations(from_html(`<div class="line svelte-1lxqddh"><span class="tok-key svelte-1lxqddh">&nbsp;&nbsp;"description"</span><span class="tok-colon svelte-1lxqddh">:</span><span class="tok-str svelte-1lxqddh"> </span><span class="tok-comma svelte-1lxqddh">,</span></div>`), ComposerEditor[FILENAME], [[214, 29, [[215, 5], [215, 59], [218, 12], [218, 65]]]]);
	var root_13 = add_locations(from_html(`<span class="tok-comma svelte-1lxqddh">,</span>`), ComposerEditor[FILENAME], [[236, 57]]);
	var root_15 = add_locations(from_html(`<span class="badge badge--loading svelte-1lxqddh"><span class="spin-sm svelte-1lxqddh"></span></span>`), ComposerEditor[FILENAME], [[239, 48, [[241, 10]]]]);
	var root_16 = add_locations(from_html(`<span class="badge badge--ok svelte-1lxqddh"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" class="svelte-1lxqddh"><polyline points="13 4 6.5 11 3 7.5"></polyline></svg> </span>`), ComposerEditor[FILENAME], [[242, 49, [[244, 10, [[249, 11]]]]]]);
	var root_17 = add_locations(from_html(`<button class="badge badge--update svelte-1lxqddh"> </button>`), ComposerEditor[FILENAME], [[251, 53]]);
	var root_18 = add_locations(from_html(`<span class="badge badge--error svelte-1lxqddh">✕</span>`), ComposerEditor[FILENAME], [[255, 16]]);
	var root_19 = add_locations(from_html(`<a class="link-icon svelte-1lxqddh" title="Homepage"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" class="svelte-1lxqddh"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 1.5A9.5 9.5 0 0 1 11 8 9.5 9.5 0 0 1 8 14.5M8 1.5A9.5 9.5 0 0 0 5 8 9.5 9.5 0 0 0 8 14.5M1.5 8h13"></path></svg></a>`), ComposerEditor[FILENAME], [[256, 43, [[260, 10, [[265, 11], [265, 43]]]]]]);
	var root_14 = add_locations(from_html(`<span class="pkg-status svelte-1lxqddh"><!><!><a class="link-icon svelte-1lxqddh" title="Packagist"><svg viewBox="0 0 16 16" fill="currentColor" class="svelte-1lxqddh"><path d="M8 1 L14 4.5 L14 11.5 L8 15 L2 11.5 L2 4.5 Z" fill="none" stroke="currentColor" stroke-width="1.5"></path><text x="8" y="10.5" text-anchor="middle" font-size="6" font-weight="700" fill="currentColor">P</text></svg></a></span>`), ComposerEditor[FILENAME], [[238, 25, [[269, 14, [[273, 9, [[274, 10], [279, 11]]]]]]]]);
	var root_12 = add_locations(from_html(`<div class="line pkg-line svelte-1lxqddh"><span class="tok-pkg svelte-1lxqddh"> </span><span class="tok-colon svelte-1lxqddh">:</span><span class="tok-ver svelte-1lxqddh"> </span><!><!></div>`), ComposerEditor[FILENAME], [[231, 5, [[232, 6], [232, 67], [235, 13]]]]);

	var root_11 = add_locations(from_html(`<div class="line svelte-1lxqddh"><span class="tok-section svelte-1lxqddh">&nbsp;&nbsp;"require"</span><span class="tok-colon svelte-1lxqddh">:</span><span class="tok-brace svelte-1lxqddh"></span></div> <!> <div class="line svelte-1lxqddh"><span class="tok-brace svelte-1lxqddh"></span><span class="tok-comma svelte-1lxqddh">,</span></div>`, 1), ComposerEditor[FILENAME], [
		[223, 4, [[224, 5], [224, 59], [227, 12]]],
		[292, 4, [[293, 5], [293, 53]]]
	]);

	var root_22 = add_locations(from_html(`<span class="tok-comma svelte-1lxqddh">,</span>`), ComposerEditor[FILENAME], [[313, 64]]);
	var root_24 = add_locations(from_html(`<span class="badge badge--loading svelte-1lxqddh"><span class="spin-sm svelte-1lxqddh"></span></span>`), ComposerEditor[FILENAME], [[316, 48, [[318, 10]]]]);
	var root_25 = add_locations(from_html(`<span class="badge badge--ok svelte-1lxqddh"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" class="svelte-1lxqddh"><polyline points="13 4 6.5 11 3 7.5"></polyline></svg> </span>`), ComposerEditor[FILENAME], [[319, 49, [[321, 10, [[326, 11]]]]]]);
	var root_26 = add_locations(from_html(`<button class="badge badge--update svelte-1lxqddh"> </button>`), ComposerEditor[FILENAME], [[328, 53]]);
	var root_27 = add_locations(from_html(`<span class="badge badge--error svelte-1lxqddh">✕</span>`), ComposerEditor[FILENAME], [[332, 16]]);
	var root_28 = add_locations(from_html(`<a class="link-icon svelte-1lxqddh" title="Homepage"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" class="svelte-1lxqddh"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 1.5A9.5 9.5 0 0 1 11 8 9.5 9.5 0 0 1 8 14.5M8 1.5A9.5 9.5 0 0 0 5 8 9.5 9.5 0 0 0 8 14.5M1.5 8h13"></path></svg></a>`), ComposerEditor[FILENAME], [[333, 43, [[337, 10, [[342, 11], [342, 43]]]]]]);
	var root_23 = add_locations(from_html(`<span class="pkg-status svelte-1lxqddh"><!><!><a class="link-icon svelte-1lxqddh" title="Packagist"><svg viewBox="0 0 16 16" fill="currentColor" class="svelte-1lxqddh"><path d="M8 1 L14 4.5 L14 11.5 L8 15 L2 11.5 L2 4.5 Z" fill="none" stroke="currentColor" stroke-width="1.5"></path><text x="8" y="10.5" text-anchor="middle" font-size="6" font-weight="700" fill="currentColor">P</text></svg></a></span>`), ComposerEditor[FILENAME], [[315, 25, [[346, 14, [[350, 9, [[351, 10], [356, 11]]]]]]]]);
	var root_21 = add_locations(from_html(`<div class="line pkg-line svelte-1lxqddh"><span class="tok-pkg svelte-1lxqddh"> </span><span class="tok-colon svelte-1lxqddh">:</span><span class="tok-ver tok-ver--dev svelte-1lxqddh"> </span><!><!></div>`), ComposerEditor[FILENAME], [[308, 5, [[309, 6], [309, 67], [312, 13]]]]);

	var root_20 = add_locations(from_html(`<div class="line svelte-1lxqddh"><span class="tok-section svelte-1lxqddh">&nbsp;&nbsp;"require-dev"</span><span class="tok-colon svelte-1lxqddh">:</span><span class="tok-brace svelte-1lxqddh"></span></div> <!> <div class="line svelte-1lxqddh"><span class="tok-brace svelte-1lxqddh"></span></div>`, 1), ComposerEditor[FILENAME], [
		[300, 4, [[301, 5], [301, 63], [304, 12]]],
		[369, 4, [[369, 22]]]
	]);

	var root$2 = add_locations(from_html(`<div class="editor svelte-1lxqddh"><div class="editor__meta svelte-1lxqddh"><div class="editor__metaLeft svelte-1lxqddh"><span class="meta__filename svelte-1lxqddh">composer.json</span> <!> <!></div> <div class="editor__metaRight svelte-1lxqddh"><!> <!> <span class="stat stat--total svelte-1lxqddh"> </span></div></div> <div class="editor__body svelte-1lxqddh"><div class="code svelte-1lxqddh"><div class="line svelte-1lxqddh"><span class="tok-brace svelte-1lxqddh"></span></div> <!> <!> <!> <!> <div class="line svelte-1lxqddh"><span class="tok-brace svelte-1lxqddh"></span></div></div></div></div>`), ComposerEditor[FILENAME], [
		[
			155,
			0,
			[
				[156, 1, [[157, 2, [[158, 3]]], [167, 2, [[199, 3]]]]],
				[
					203,
					1,
					[[204, 2, [[205, 3, [[205, 21]]], [372, 3, [[372, 21]]]]]]
				]
			]
		]
	]);

	function ComposerEditor($$anchor, $$props) {
		check_target(new.target);
		push($$props, true);

		/**
		 * Props:
		 *   project   – { id, name, path }
		 *   rawJson   – raw string content of composer.json
		 *   onRefresh – callback(newRawJson) called after a version update
		 */
		let onRefresh = prop($$props, 'onRefresh', 3, () => {});

		let composer = tag(
			user_derived(() => {
				try {
					return JSON.parse($$props.rawJson);
				} catch {
					return {};
				}
			}),
			'composer'
		);

		let infoMap = tag(state(proxy({})), 'infoMap');

		user_effect(() => {
			$$props.rawJson;

			set(infoMap, {}, true);

			// Exclude PHP itself and extension constraints (e.g. "php", "ext-json")
			const isRealPackage = (name) => strict_equals(name, "php", false) && !name.startsWith("ext-") && !name.startsWith("lib-");

			const allNames = [
				...Object.keys(get$1(composer).require ?? {}).filter(isRealPackage),
				...Object.keys(get$1(composer)["require-dev"] ?? {}).filter(isRealPackage)
			];

			if (strict_equals(allNames.length, 0)) return;

			const initial = {};

			for (const n of allNames) initial[n] = { status: "loading" };

			set(infoMap, initial, true);

			fetchComposerPackagesInfo(allNames, (name, data) => {
				set(
					infoMap,
					{
						...get$1(infoMap),
						[name]: data
							? { status: data.version ? "fetched" : "error", ...data }
							: { status: "error" }
					},
					true
				);
			});
		});

		function getStatus(pkgName, currentRaw) {
			const info = get$1(infoMap)[pkgName];

			if (!info || strict_equals(info.status, "loading")) return "loading";
			if (strict_equals(info.status, "error")) return "error";

			const latest = info.version;

			if (!latest) return "error";

			const current = currentRaw.replace(/^[^\d]*/, "");

			return strict_equals(current, latest) ? "ok" : "update";
		}

		function getLatest(pkgName) {
			return get$1(infoMap)[pkgName]?.version ?? null;
		}

		async function handleUpdate(pkgName, latestVersion, isDev) {
			try {
				const updated = (await track_reactivity_loss(updateComposerPackageVersion($$props.project.path, pkgName, latestVersion, isDev)))();

				toast.success(`Updated ${pkgName}`, { description: `→ ${updated}`, position: "bottom-center" });

				try {
					const newRaw = (await track_reactivity_loss(getProjectComposerPackages($$props.project.path)))();

					onRefresh()(newRaw);
				} catch {
					/* ignore read error */
				}

				set(
					infoMap,
					{
						...get$1(infoMap),
						[pkgName]: { ...get$1(infoMap)[pkgName], status: "fetched" }
					},
					true
				);
			} catch(err) {
				toast.error(`Failed to update ${pkgName}`, { description: err.message, position: "bottom-center" });
			}
		}

		// Only count packages we actually fetch info for (not php/ext-*)
		const isRealPackage = (name) => strict_equals(name, "php", false) && !name.startsWith("ext-") && !name.startsWith("lib-");

		let stats = tag(
			user_derived(() => {
				let total = 0, outdated = 0, loading = 0;

				for (const [name, raw] of Object.entries(get$1(composer).require ?? {})) {
					if (!isRealPackage(name)) continue;

					total++;

					const s = getStatus(name, raw);

					if (strict_equals(s, "loading")) loading++;
					if (strict_equals(s, "update")) outdated++;
				}

				for (const [name, raw] of Object.entries(get$1(composer)["require-dev"] ?? {})) {
					if (!isRealPackage(name)) continue;

					total++;

					const s = getStatus(name, raw);

					if (strict_equals(s, "loading")) loading++;
					if (strict_equals(s, "update")) outdated++;
				}

				return { total, outdated, loading };
			}),
			'stats'
		);

		let lockStatus = tag(state("ok"), 'lockStatus');
		let installing = tag(state(false), 'installing');

		user_effect(() => {
			$$props.rawJson;

			if ($$props.project?.path) {
				set(lockStatus, checkComposerLockFile($$props.project.path), true);
			}
		});

		async function handleInstall() {
			set(installing, true);

			try {
				(await track_reactivity_loss(runComposerInstall($$props.project.path)))();
				set(lockStatus, checkComposerLockFile($$props.project.path), true);
				toast.success("composer install complete", { position: "bottom-center" });
			} catch(err) {
				toast.error("composer install failed", { description: err.message, position: "bottom-center" });
			} finally {
				set(installing, false);
			}
		}

		var $$exports = { ...legacy_api() };
		var div = root$2();
		var div_1 = child(div);
		var div_2 = child(div_1);
		var node = sibling(child(div_2), 2);

		{
			var consequent = ($$anchor) => {
				var fragment = root_1();
				var span = sibling(first_child(fragment), 2);
				var text = child(span);
				template_effect(() => set_text(text, get$1(composer).name));
				append($$anchor, fragment);
			};

			add_svelte_meta(
				() => if_block(node, ($$render) => {
					if (get$1(composer).name) $$render(consequent);
				}),
				'if',
				ComposerEditor,
				159,
				3
			);
		}

		var node_1 = sibling(node, 2);

		{
			var consequent_1 = ($$anchor) => {
				var span_1 = root_2$1();
				var text_1 = child(span_1);
				template_effect(() => set_text(text_1, `v${get$1(composer).version ?? ''}`));
				append($$anchor, span_1);
			};

			add_svelte_meta(
				() => if_block(node_1, ($$render) => {
					if (get$1(composer).version) $$render(consequent_1);
				}),
				'if',
				ComposerEditor,
				163,
				3
			);
		}

		var div_3 = sibling(div_2, 2);
		var node_2 = child(div_3);

		{
			var consequent_3 = ($$anchor) => {
				var button = root_3();
				var node_3 = child(button);

				{
					var consequent_2 = ($$anchor) => {
						var fragment_1 = root_4$1();
						append($$anchor, fragment_1);
					};

					var alternate = ($$anchor) => {
						var fragment_2 = root_5$1();
						var text_2 = sibling(first_child(fragment_2), 1, true);

						template_effect(() => set_text(text_2, strict_equals(get$1(lockStatus), "missing") ? "Install" : "Sync"));
						append($$anchor, fragment_2);
					};

					add_svelte_meta(
						() => if_block(node_3, ($$render) => {
							if (get$1(installing)) $$render(consequent_2); else $$render(alternate, -1);
						}),
						'if',
						ComposerEditor,
						174,
						5
					);
				}
				template_effect(() => button.disabled = get$1(installing));
				delegated('click', button, handleInstall);
				append($$anchor, button);
			};

			add_svelte_meta(
				() => if_block(node_2, ($$render) => {
					if (strict_equals(get$1(lockStatus), "stale") || strict_equals(get$1(lockStatus), "missing")) $$render(consequent_3);
				}),
				'if',
				ComposerEditor,
				168,
				3
			);
		}

		var node_4 = sibling(node_2, 2);

		{
			var consequent_4 = ($$anchor) => {
				var span_2 = root_6();
				var text_3 = sibling(child(span_2));
				template_effect(() => set_text(text_3, ` Checking ${get$1(stats).loading ?? ''}…`));
				append($$anchor, span_2);
			};

			var consequent_5 = ($$anchor) => {
				var span_3 = root_7();
				var text_4 = child(span_3);
				template_effect(() => set_text(text_4, `${get$1(stats).outdated ?? ''} outdated`));
				append($$anchor, span_3);
			};

			var alternate_1 = ($$anchor) => {
				var span_4 = root_8();

				append($$anchor, span_4);
			};

			add_svelte_meta(
				() => if_block(node_4, ($$render) => {
					if (get$1(stats).loading > 0) $$render(consequent_4); else if (get$1(stats).outdated > 0) $$render(consequent_5, 1); else $$render(alternate_1, -1);
				}),
				'if',
				ComposerEditor,
				189,
				3
			);
		}

		var span_5 = sibling(node_4, 2);
		var text_5 = child(span_5);

		var div_4 = sibling(div_1, 2);
		var div_5 = child(div_4);
		var div_6 = child(div_5);
		var span_6 = child(div_6);

		span_6.textContent = '{';

		var node_5 = sibling(div_6, 2);

		{
			var consequent_6 = ($$anchor) => {
				var div_7 = root_9();
				var span_7 = sibling(child(div_7), 2);
				var text_6 = child(span_7);
				template_effect(() => set_text(text_6, `"${get$1(composer).name ?? ''}"`));
				append($$anchor, div_7);
			};

			add_svelte_meta(
				() => if_block(node_5, ($$render) => {
					if (get$1(composer).name) $$render(consequent_6);
				}),
				'if',
				ComposerEditor,
				207,
				3
			);
		}

		var node_6 = sibling(node_5, 2);

		{
			var consequent_7 = ($$anchor) => {
				var div_8 = root_10();
				var span_8 = sibling(child(div_8), 2);
				var text_7 = child(span_8);
				template_effect(() => set_text(text_7, `"${get$1(composer).description ?? ''}"`));
				append($$anchor, div_8);
			};

			add_svelte_meta(
				() => if_block(node_6, ($$render) => {
					if (get$1(composer).description) $$render(consequent_7);
				}),
				'if',
				ComposerEditor,
				214,
				3
			);
		}

		var node_7 = sibling(node_6, 2);

		{
			var consequent_14 = ($$anchor) => {
				var fragment_3 = root_11();
				var div_9 = first_child(fragment_3);
				var span_9 = sibling(child(div_9), 2);

				span_9.textContent = '{';

				var node_8 = sibling(div_9, 2);

				add_svelte_meta(
					() => each(node_8, 17, () => Object.entries(get$1(composer).require), index, ($$anchor, $$item, i) => {
						var $$array = user_derived(() => to_array(get$1($$item), 2));
						let name = () => get$1($$array)[0];

						name();

						let ver = () => get$1($$array)[1];

						ver();

						const isReal = tag(user_derived(() => isRealPackage(name())), 'isReal');

						get$1(isReal);

						var div_10 = root_12();
						var span_10 = child(div_10);
						var text_8 = child(span_10);

						reset(span_10);

						var span_11 = sibling(span_10, 2);
						var text_9 = child(span_11);

						reset(span_11);

						var node_9 = sibling(span_11);

						{
							var consequent_8 = ($$anchor) => {
								var span_12 = root_13();

								append($$anchor, span_12);
							};

							var d = user_derived(() => i < Object.keys(get$1(composer).require).length - 1);

							add_svelte_meta(
								() => if_block(node_9, ($$render) => {
									if (get$1(d)) $$render(consequent_8);
								}),
								'if',
								ComposerEditor,
								236,
								7
							);
						}

						var node_10 = sibling(node_9);

						{
							var consequent_13 = ($$anchor) => {
								var span_13 = root_14();
								var node_11 = child(span_13);

								{
									var consequent_9 = ($$anchor) => {
										var span_14 = root_15();

										append($$anchor, span_14);
									};

									var d_1 = user_derived(() => strict_equals(getStatus(name(), ver()), "loading"));

									var consequent_10 = ($$anchor) => {
										var span_15 = root_16();
										var text_10 = sibling(child(span_15), 1, true);

										reset(span_15);
										template_effect(($0) => set_text(text_10, $0), [() => getLatest(name())]);
										append($$anchor, span_15);
									};

									var d_2 = user_derived(() => strict_equals(getStatus(name(), ver()), "ok"));

									var consequent_11 = ($$anchor) => {
										var button_1 = root_17();
										var text_11 = child(button_1);

										reset(button_1);
										template_effect(($0) => set_text(text_11, `↑ ${$0 ?? ''}`), [() => getLatest(name())]);

										delegated('click', button_1, function click() {
											return handleUpdate(name(), getLatest(name()), false);
										});

										append($$anchor, button_1);
									};

									var d_3 = user_derived(() => strict_equals(getStatus(name(), ver()), "update"));

									var alternate_2 = ($$anchor) => {
										var span_16 = root_18();

										append($$anchor, span_16);
									};

									add_svelte_meta(
										() => if_block(node_11, ($$render) => {
											if (get$1(d_1)) $$render(consequent_9); else if (get$1(d_2)) $$render(consequent_10, 1); else if (get$1(d_3)) $$render(consequent_11, 2); else $$render(alternate_2, -1);
										}),
										'if',
										ComposerEditor,
										239,
										8
									);
								}

								var node_12 = sibling(node_11);

								{
									var consequent_12 = ($$anchor) => {
										var a = root_19();

										template_effect(() => set_attribute(a, 'href', get$1(infoMap)[name()].homepage));
										append($$anchor, a);
									};

									add_svelte_meta(
										() => if_block(node_12, ($$render) => {
											if (get$1(infoMap)[name()]?.homepage) $$render(consequent_12);
										}),
										'if',
										ComposerEditor,
										256,
										14
									);
								}

								var a_1 = sibling(node_12);

								reset(span_13);
								template_effect(() => set_attribute(a_1, 'href', `https://packagist.org/packages/${name()}`));
								append($$anchor, span_13);
							};

							add_svelte_meta(
								() => if_block(node_10, ($$render) => {
									if (get$1(isReal)) $$render(consequent_13);
								}),
								'if',
								ComposerEditor,
								238,
								13
							);
						}

						reset(div_10);

						template_effect(() => {
							set_text(text_8, `    "${name() ?? ''}"`);
							set_text(text_9, `"${ver() ?? ''}"`);
						});

						append($$anchor, div_10);
					}),
					'each',
					ComposerEditor,
					229,
					4
				);

				var div_11 = sibling(node_8, 2);
				var span_17 = child(div_11);

				span_17.textContent = '  }';
				append($$anchor, fragment_3);
			};

			var d_4 = user_derived(() => get$1(composer).require && Object.keys(get$1(composer).require).length > 0);

			add_svelte_meta(
				() => if_block(node_7, ($$render) => {
					if (get$1(d_4)) $$render(consequent_14);
				}),
				'if',
				ComposerEditor,
				222,
				3
			);
		}

		var node_13 = sibling(node_7, 2);

		{
			var consequent_21 = ($$anchor) => {
				var fragment_4 = root_20();
				var div_12 = first_child(fragment_4);
				var span_18 = sibling(child(div_12), 2);

				span_18.textContent = '{';

				var node_14 = sibling(div_12, 2);

				add_svelte_meta(
					() => each(node_14, 17, () => Object.entries(get$1(composer)["require-dev"]), index, ($$anchor, $$item, i) => {
						var $$array_1 = user_derived(() => to_array(get$1($$item), 2));
						let name = () => get$1($$array_1)[0];

						name();

						let ver = () => get$1($$array_1)[1];

						ver();

						const isReal = tag(user_derived(() => isRealPackage(name())), 'isReal');

						get$1(isReal);

						var div_13 = root_21();
						var span_19 = child(div_13);
						var text_12 = child(span_19);

						reset(span_19);

						var span_20 = sibling(span_19, 2);
						var text_13 = child(span_20);

						reset(span_20);

						var node_15 = sibling(span_20);

						{
							var consequent_15 = ($$anchor) => {
								var span_21 = root_22();

								append($$anchor, span_21);
							};

							var d_5 = user_derived(() => i < Object.keys(get$1(composer)["require-dev"]).length - 1);

							add_svelte_meta(
								() => if_block(node_15, ($$render) => {
									if (get$1(d_5)) $$render(consequent_15);
								}),
								'if',
								ComposerEditor,
								313,
								7
							);
						}

						var node_16 = sibling(node_15);

						{
							var consequent_20 = ($$anchor) => {
								var span_22 = root_23();
								var node_17 = child(span_22);

								{
									var consequent_16 = ($$anchor) => {
										var span_23 = root_24();

										append($$anchor, span_23);
									};

									var d_6 = user_derived(() => strict_equals(getStatus(name(), ver()), "loading"));

									var consequent_17 = ($$anchor) => {
										var span_24 = root_25();
										var text_14 = sibling(child(span_24), 1, true);

										reset(span_24);
										template_effect(($0) => set_text(text_14, $0), [() => getLatest(name())]);
										append($$anchor, span_24);
									};

									var d_7 = user_derived(() => strict_equals(getStatus(name(), ver()), "ok"));

									var consequent_18 = ($$anchor) => {
										var button_2 = root_26();
										var text_15 = child(button_2);

										reset(button_2);
										template_effect(($0) => set_text(text_15, `↑ ${$0 ?? ''}`), [() => getLatest(name())]);

										delegated('click', button_2, function click_1() {
											return handleUpdate(name(), getLatest(name()), true);
										});

										append($$anchor, button_2);
									};

									var d_8 = user_derived(() => strict_equals(getStatus(name(), ver()), "update"));

									var alternate_3 = ($$anchor) => {
										var span_25 = root_27();

										append($$anchor, span_25);
									};

									add_svelte_meta(
										() => if_block(node_17, ($$render) => {
											if (get$1(d_6)) $$render(consequent_16); else if (get$1(d_7)) $$render(consequent_17, 1); else if (get$1(d_8)) $$render(consequent_18, 2); else $$render(alternate_3, -1);
										}),
										'if',
										ComposerEditor,
										316,
										8
									);
								}

								var node_18 = sibling(node_17);

								{
									var consequent_19 = ($$anchor) => {
										var a_2 = root_28();

										template_effect(() => set_attribute(a_2, 'href', get$1(infoMap)[name()].homepage));
										append($$anchor, a_2);
									};

									add_svelte_meta(
										() => if_block(node_18, ($$render) => {
											if (get$1(infoMap)[name()]?.homepage) $$render(consequent_19);
										}),
										'if',
										ComposerEditor,
										333,
										14
									);
								}

								var a_3 = sibling(node_18);

								reset(span_22);
								template_effect(() => set_attribute(a_3, 'href', `https://packagist.org/packages/${name()}`));
								append($$anchor, span_22);
							};

							add_svelte_meta(
								() => if_block(node_16, ($$render) => {
									if (get$1(isReal)) $$render(consequent_20);
								}),
								'if',
								ComposerEditor,
								315,
								13
							);
						}

						reset(div_13);

						template_effect(() => {
							set_text(text_12, `    "${name() ?? ''}"`);
							set_text(text_13, `"${ver() ?? ''}"`);
						});

						append($$anchor, div_13);
					}),
					'each',
					ComposerEditor,
					306,
					4
				);

				var div_14 = sibling(node_14, 2);
				var span_26 = child(div_14);

				span_26.textContent = '  }';
				append($$anchor, fragment_4);
			};

			var d_9 = user_derived(() => get$1(composer)["require-dev"] && Object.keys(get$1(composer)["require-dev"]).length > 0);

			add_svelte_meta(
				() => if_block(node_13, ($$render) => {
					if (get$1(d_9)) $$render(consequent_21);
				}),
				'if',
				ComposerEditor,
				299,
				3
			);
		}

		var div_15 = sibling(node_13, 2);
		var span_27 = child(div_15);

		span_27.textContent = '}';
		template_effect(() => set_text(text_5, `${get$1(stats).total ?? ''} packages`));
		append($$anchor, div);

		return pop($$exports);
	}

	delegate(['click']);

	Main[FILENAME] = 'src/components/main.svelte';

	var root_2 = add_locations(from_html(`<section class="empty svelte-ifpaur"><div class="empty__card svelte-ifpaur"><img src="./images/add.png" alt="Add project" class="empty__img svelte-ifpaur"/> <h1 class="empty__title svelte-ifpaur">No Project Selected</h1> <p class="empty__sub svelte-ifpaur">Add a project to view and manage its packages.</p> <button class="empty__btn svelte-ifpaur"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg" class="svelte-ifpaur"><line x1="12" y1="5" x2="12" y2="19" class="svelte-ifpaur"></line><line x1="5" y1="12" x2="19" y2="12" class="svelte-ifpaur"></line></svg> Add Project</button></div></section>`), Main[FILENAME], [
		[
			80,
			3,
			[
				[
					81,
					4,
					[
						[82, 5],
						[83, 5],
						[84, 5],
						[87, 5, [[88, 6, [[95, 7], [96, 7]]]]]
					]
				]
			]
		]
	]);

	var root_5 = add_locations(from_html(`<span class="pkgView__loadingDot svelte-ifpaur"></span>`), Main[FILENAME], [[121, 8]]);

	var root_4 = add_locations(from_html(`<section class="pkgView svelte-ifpaur"><header class="pkgView__header svelte-ifpaur"><div class="pkgView__headerInner svelte-ifpaur"><svg class="pkgView__headerIcon svelte-ifpaur" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" class="svelte-ifpaur"></path></svg> <h1 class="pkgView__title svelte-ifpaur"> </h1> <!></div></header> <!></section>`), Main[FILENAME], [
		[
			104,
			4,
			[[105, 5, [[106, 6, [[107, 7, [[115, 8]]], [119, 7]]]]]]
		]
	]);

	var root$1 = add_locations(from_html(`<div class="content svelte-ifpaur"><!></div> <!>`, 1), Main[FILENAME], [[77, 0]]);

	function Main($$anchor, $$props) {
		check_target(new.target);
		push($$props, true);

		const $menuActive = () => (
			validate_store(menuActive),
			store_get(menuActive, '$menuActive', $$stores)
		);

		const $projects = () => (
			validate_store(projects),
			store_get(projects, '$projects', $$stores)
		);

		const [$$stores, $$cleanup] = setup_stores();
		let currentProjectID = tag(state(false), 'currentProjectID');
		let currentProject = tag(state(undefined), 'currentProject');
		let rawJson = tag(state(""), 'rawJson');
		let projectType = tag(state("npm" // "npm" | "composer"
		), 'projectType');
		let loading = tag(state(false), 'loading');

		// Track menuActive and projects reactively (Svelte 5 pattern)
		user_effect(() => {
			const value = $menuActive();

			set(currentProjectID, value ? value.split("_")[1] : false, true);

			const found = $projects().find((item) => strict_equals(item.id, parseInt(get$1(currentProjectID))));

			set(currentProject, found, true);

			if (found) {
				loadProject(found.path);
			} else {
				set(rawJson, "");
				set(loading, false);
			}
		});

		async function loadProject(projectPath) {
			set(loading, true);

			try {
				// Try composer.json first; fall back to package.json
				try {
					set(rawJson, (await track_reactivity_loss(getProjectComposerPackages(projectPath)))(), true);
					set(projectType, "composer");
				} catch {
					set(rawJson, (await track_reactivity_loss(getProjectPackages(projectPath)))(), true);
					set(projectType, "npm");
				}
			} catch {
				set(rawJson, "");
			}

			set(loading, false);
		}

		async function addProject() {
			try {
				const result = (await track_reactivity_loss(openDirectory()))();

				if (result.length > 0) {
					const projectPath = result[0];
					const parts = result[0].split("/");
					const projectName = parts[parts.length - 1];

					projects.update((list) => {
						const newId = list.length > 0 ? list[list.length - 1].id + 1 : 0;

						return [...list, { id: newId, name: projectName, path: projectPath }];
					});

					localStorage.setItem("projects", JSON.stringify($projects()));
				}
			} catch(err) {
				console.error(...log_if_contains_state('error', err));
			}
		}

		function handleRefresh(newRaw) {
			set(rawJson, newRaw, true);
		}

		var $$exports = { ...legacy_api() };
		var fragment = root$1();
		var div = first_child(fragment);
		var node = child(div);

		add_svelte_meta(
			() => SimpleBar_1(node, {
				maxHeight: "calc(100vh)",
				children: wrap_snippet(Main, ($$anchor, $$slotProps) => {
					var fragment_1 = comment();
					var node_1 = first_child(fragment_1);

					{
						var consequent = ($$anchor) => {
							var section = root_2();
							var div_1 = child(section);
							var button = sibling(child(div_1), 6);

							reset(div_1);
							reset(section);
							delegated('click', button, addProject);
							transition(3, section, () => blur, () => ({ duration: 200 }));
							append($$anchor, section);
						};

						var alternate_1 = ($$anchor) => {
							var fragment_2 = comment();
							var node_2 = first_child(fragment_2);

							add_svelte_meta(
								() => key(node_2, () => get$1(currentProjectID), ($$anchor) => {
									var section_1 = root_4();
									var header = child(section_1);
									var div_2 = child(header);
									var h1 = sibling(child(div_2), 2);
									var text = child(h1, true);

									reset(h1);

									var node_3 = sibling(h1, 2);

									{
										var consequent_1 = ($$anchor) => {
											var span = root_5();

											append($$anchor, span);
										};

										add_svelte_meta(
											() => if_block(node_3, ($$render) => {
												if (get$1(loading)) $$render(consequent_1);
											}),
											'if',
											Main,
											120,
											7
										);
									}

									reset(div_2);
									reset(header);

									var node_4 = sibling(header, 2);

									{
										var consequent_2 = ($$anchor) => {
											add_svelte_meta(
												() => ComposerEditor($$anchor, {
													get project() {
														return get$1(currentProject);
													},

													get rawJson() {
														return get$1(rawJson);
													},
													onRefresh: handleRefresh
												}),
												'component',
												Main,
												127,
												6,
												{ componentTag: 'ComposerEditor' }
											);
										};

										var alternate = ($$anchor) => {
											add_svelte_meta(
												() => PackageEditor($$anchor, {
													get project() {
														return get$1(currentProject);
													},

													get rawJson() {
														return get$1(rawJson);
													},
													onRefresh: handleRefresh
												}),
												'component',
												Main,
												133,
												6,
												{ componentTag: 'PackageEditor' }
											);
										};

										add_svelte_meta(
											() => if_block(node_4, ($$render) => {
												if (strict_equals(get$1(projectType), "composer")) $$render(consequent_2); else $$render(alternate, -1);
											}),
											'if',
											Main,
											126,
											5
										);
									}

									reset(section_1);
									template_effect(() => set_text(text, get$1(currentProject).name));
									transition(3, section_1, () => blur, () => ({ duration: 200 }));
									append($$anchor, section_1);
								}),
								'key',
								Main,
								103,
								3
							);

							append($$anchor, fragment_2);
						};

						add_svelte_meta(
							() => if_block(node_1, ($$render) => {
								if (!get$1(currentProject)) $$render(consequent); else $$render(alternate_1, -1);
							}),
							'if',
							Main,
							79,
							2
						);
					}

					append($$anchor, fragment_1);
				}),
				$$slots: { default: true }
			}),
			'component',
			Main,
			78,
			1,
			{ componentTag: 'SimpleBar' }
		);

		var node_5 = sibling(div, 2);

		add_svelte_meta(() => Toaster(node_5, { position: 'bottom-center', theme: 'dark', richColors: true }), 'component', Main, 144, 0, { componentTag: 'Toaster' });
		append($$anchor, fragment);

		var $$pop = pop($$exports);

		$$cleanup();

		return $$pop;
	}

	delegate(['click']);

	App[FILENAME] = 'src/App.svelte';

	var root = add_locations(from_html(`<div class="app svelte-1n46o8q"><!> <!></div>`), App[FILENAME], [[6, 0]]);

	function App($$anchor, $$props) {
		check_target(new.target);
		push($$props, false);

		var $$exports = { ...legacy_api() };
		var div = root();
		var node = child(div);

		add_svelte_meta(() => Sidebar(node, {}), 'component', App, 7, 1, { componentTag: 'Sidebar' });

		var node_1 = sibling(node, 2);

		add_svelte_meta(() => Main(node_1, {}), 'component', App, 8, 1, { componentTag: 'Main' });
		append($$anchor, div);

		return pop($$exports);
	}

	// Set platform class for CSS-based platform-specific styling
	document.body.setAttribute("data-platform", process.platform);

	const app = mount(App, {
		target: document.body,
	});

	return app;

})(require("util"), require("fs"), require("path"), require("child_process"), require("electron"));
//# sourceMappingURL=bundle.js.map
