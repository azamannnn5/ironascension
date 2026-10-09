/* Iron Ascension - FAQ accordion
   Expands/collapses .faq-item blocks on click. Multiple can be open at
   once - no reason to force single-open here. */
document.addEventListener("click", (e) => {
  const question = e.target.closest(".faq-question");
  if (!question) return;
  const item = question.closest(".faq-item");
  const answer = item.querySelector(".faq-answer");
  const isOpen = item.classList.toggle("open");
  answer.style.maxHeight = isOpen ? `${answer.scrollHeight}px` : "0px";
});
