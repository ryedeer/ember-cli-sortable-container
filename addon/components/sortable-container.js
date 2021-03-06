import Component from '@ember/component';
import layout from '../templates/components/sortable-container';
import { clientPoint, joinList, Rect } from '../utils/geometry';
import DragState from '../drag-state';
const { min, max, sign, floor } = Math;

const SortableContainerComponent = Component.extend({
  layout,
  projection: false,
  takeOut: true,
  lockAxis: false,
  dragHandle: null,
  // group
  // dragFrom: [],
  // dragTo: [],

  classNames: ['ember-cli-sortable-container', 'no-select'],

  // Default guards
  canPick: () => true,
  canPut: () => true,

  // Animation callbacks
  onDragStart: () => Promise.resolve(),
  onDragEnd: () => Promise.resolve(),

  init() {
    this.set('state', DragState.create({container: this}));
    this.dragListener = this.dragging.bind(this);
    this.dropListener = this.dropping.bind(this);
    this.rectUpdateListener = this.updateRects.bind(this);
    this._super(...arguments);
  },

  callback(cb) {
    return this.get(cb)(this.get('state'));
  },

  mouseDown(e) {
    if (e.button != 0) return;
    if (this.get('items.length') == 0) return;

    if (this.get('state').findTarget(e.target) && this.callback('canPick')) {
      this.setIsVertical();
      this.get('state').prepare(clientPoint(e));
      this.updateRects();
      this.addListeners();
    }
  },

  dragging(e) {
    if (!this.get('state.isDragging')) {
      this.get('state').attach();
      this.callback('onDragStart');
    }
    this.get('state').move(clientPoint(e), this.get('bounds'));

    if (this.canTakeOut() && !this.inContainer())
      this.get('state').takeOut();

    if (!this.canInteract()) return;

    const index = this.targetIndex();
    if (index == this.get('state.index') || index == this.get('state.index') + 1) return;

    this.set('state.targetIndex', index);
    if (this.callback('canPut')) this.get('state').insertItem();
    this.set('state.targetIndex', undefined);
  },

  dropping() {
    this.callback('onDragEnd');
    this.get('state').drop();
    this.removeListeners();
  },

  targetIndex() {
    let targetIndex = this.get('rects.length');
    if (targetIndex > 0) {
      const ds = this.get('rects').map((r) => r.distance(this.get('state.rect')));
      const delta = ds.indexOf(ds.reduce((acc, d) => min(acc, d)));
      const {x, y} = this.get('state.rect').offset(this.get('rects')[delta]);
      targetIndex = delta + max(0, sign(floor(this.get('isVertical') ? y : x)));
    }
    return targetIndex;
  },

  canTakeOut() {
    return this.get('takeOut') && !this.get('state.takenOut');
  },

  inContainer() {
    return this.get('outerBounds').overlap(this.get('state.rect'));
  },

  canInteract() {
    return this.get('projection') && !this.get('state.takenOut') || this.inContainer();
  },

  addListeners() {
    window.addEventListener('mousemove', this.dragListener);
    window.addEventListener('mouseup', this.dropListener);
    window.addEventListener('resize', this.rectUpdateListener);
    window.addEventListener('scroll', this.rectUpdateListener);
    this.on('didRender', this.rectUpdateListener);
  },

  removeListeners() {
    window.removeEventListener('mousemove', this.dragListener);
    window.removeEventListener('mouseup', this.dropListener);
    window.removeEventListener('resize', this.rectUpdateListener);
    window.removeEventListener('scroll', this.rectUpdateListener);
    this.off('didRender', this.rectUpdateListener);
  },

  updateRects() {
    this.setProperties({
      outerBounds: Rect.fromElement(this.element),
      rects: Array.from(this.element.children).map(Rect.fromElement)
    })
    if (this.get('lockAxis') && this.get('rects.length') > 0) {
      this.setBounds();
    } else {
      this.set('bounds', null);
    }
  },

  setBounds() {
    this.set('bounds', joinList(this.get('rects')));
    if (this.get('isVertical')) {
      this.get('bounds').bottom++;
    } else {
      this.get('bounds').right++;
    }
  },

  setIsVertical() {
    const orientation = this.get('orientation') || this.detectOrientation();
    this.set('isVertical', orientation === 'vertical');
  },

  detectOrientation() {
    if (this.element.children.length > 0) {
      const style = window.getComputedStyle(this.element.children[0]);
      return (style.display === 'block' || style.display == 'table' && style.float === 'none') ? 'vertical' : 'horizontal';
    } else {
      return 'vertical';
    }
  }
});

SortableContainerComponent.reopenClass({
  positionalParams: ['items']
});

export default SortableContainerComponent;
