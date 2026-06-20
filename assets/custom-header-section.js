

document.addEventListener("DOMContentLoaded", () => {
  
  //Getting toggle and mobilenavigation
  
  const toggleBtn = document.querySelector('#mobileToggle');
  const mobileNav = document.querySelector('#mobileNav');

  // add click event listener
  toggleBtn.addEventListener('click',()=>{

    toggleBtn.classList.toggle('active');
    mobileNav.classList.toggle('active');
    
  })
  
});