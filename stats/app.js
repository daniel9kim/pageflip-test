document.querySelectorAll('.segmented button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
  });
});

document.querySelector('#rangeSelect')?.addEventListener('change',e=>{
  console.log('Analytics range changed:', e.target.value);
});
