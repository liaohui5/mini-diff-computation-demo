// 实际渲染DOM的API

// 设置文本
export function setTextContent(el: Element, text: string): void {
  el.textContent = text;
}

// 插入节点
export function insert(child: Element, parent: Element, anchor?: Element): void {
  parent.insertBefore(child, anchor ? anchor : null);
}

// 创建节点
export function create(type: string): HTMLElement {
  return document.createElement(type);
}

// 移除节点
export function remove(el: Element): void {
  el.remove();
}
