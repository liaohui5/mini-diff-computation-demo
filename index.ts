import { ref, effect } from '@vue/reactivity';
import { h } from './src/vnode';
import { patch, render } from './src/renderer';

// Array -> Text
// const oldChildren = [h('p', null, '111'), h('p', null, '222')];
// const newChildren = '3333';

// Text -> Text
// const oldChildren = '2222';
// const newChildren = '4444';

// Text  -> Array
// const oldChildren = '3333';
// const newChildren = [h('p', null, '111'), h('p', null, '222')];

// 根据字符串创建虚拟列表
const createVNodeList = (str: string) => {
  return str.split('').map((item) => h('div', { key: item }, item));
};

// Array -> Array -> diff 算法
// 1. 左侧对比:
// old: a b c
// new: a b d e
// const oldChildren = createVNodeList('abcd');
// const newChildren = createVNodeList('abde');

// 2. 右侧对比:
// old: a b x y
// new: c d x y
// const oldChildren = createVNodeList('abc');
// const newChildren = createVNodeList('debc');

// 3.1 新的比老的多(右边)
// const oldChildren = createVNodeList('abc');
// const newChildren = createVNodeList('abcd');

// 3.2 新的比老的多(左边) 有问题,需要判断方向
// const oldChildren = createVNodeList('abc');
// const newChildren = createVNodeList('dabc');

// 4.1 新的比老的少(右边)
// const oldChildren = createVNodeList('abc');
// const newChildren = createVNodeList('ab');

// 4.2 新的比老的少(左边)
// const oldChildren = createVNodeList('cab');
// const newChildren = createVNodeList('ab');

// 5 乱序
// 1.创建新的: 在老的里面不存在, 但是在新的里面存在 d
// 2.删除老的: 在新的里面不存在, 但是在老的里面存在 y
// 3.移动位置: 节点在新的老的里面都存在, 但是位置不一致 c e
const oldChildren = createVNodeList('aefyjkz');
const newChildren = createVNodeList('aqyefjz');

// reactive data && vnodes
const app = <Element>document.querySelector('#app');
const isChanged = ref<boolean>(false);
const oldVNode = h('div', null, oldChildren);
const newVNode = h('div', null, newChildren);

// show 
const showKeys = () => {
  const oldVNodesKeys = oldChildren.map(item => item.key);
  const newVNodesKeys = newChildren.map(item => item.key);
  console.info("==== old vnodes ====", oldVNodesKeys);
  console.info("==== new vnodes ====", newVNodesKeys);
}

effect(() => {
  if (isChanged.value) {
    showKeys();
    patch(oldVNode, newVNode, app);
  } else {
    render(oldVNode, app);
  }
});

// change reactive data -> update view
/* @ts-ignore */
window.up = () => (isChanged.value = true);
