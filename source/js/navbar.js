// change navbar in mobile view
// eslint-disable-next-line no-unused-vars
const mobileBtn = function f() {
  const toggleMenu = document.getElementsByClassName('menu-toggle')[0];
  const mobileMenu = document.getElementById('mobile-menu');
  if (toggleMenu.classList.contains('active')) {
    toggleMenu.classList.remove('active');
    mobileMenu.classList.remove('active');
  } else {
    toggleMenu.classList.add('active');
    mobileMenu.classList.add('active');
  }
};

// dropdown code, based in https://codepen.io/alvarotrigo/pen/ExEdrez
// with some modifications

// Dropdown Open and Close function
function dropDownFunc(dropDown) {
  if (dropDown.classList.contains('menu-click-dropdown') === true) {
    dropDown.addEventListener('click', function (e) {
      e.preventDefault();

      if (this.nextElementSibling.classList.contains('dropdown-active') === true) {
        // Close the clicked dropdown
        this.parentElement.classList.remove('dropdown-open');
        this.nextElementSibling.classList.remove('dropdown-active');
      } else {
        // Close the opend dropdown
        closeDropdown();

        // add the open and active class(Opening the DropDown)
        this.parentElement.classList.add('dropdown-open');
        this.nextElementSibling.classList.add('dropdown-active');
      }
    });
  }

  if (dropDown.classList.contains('hover-dropdown') === true) {
    dropDown.onmouseover = dropDown.onmouseout = dropdownHover;

    function dropdownHover(e) {
      if (e.type == 'mouseover') {
        // Close the opend dropdown
        closeDropdown();

        // add the open and active class(Opening the DropDown)
        this.parentElement.classList.add('dropdown-open');
        this.nextElementSibling.classList.add('dropdown-active');
      }

      // if(e.type == 'mouseout'){
      //     // close the dropdown after user leave the list
      //     e.target.nextElementSibling.onmouseleave = closeDropdown;
      // }
    }
  }
}

// Listen to the doc click
window.addEventListener('click', function (e) {
  // Close the menu if click happen outside menu
  if (e.target.closest('.menu-dropdown-container') === null) {
    // Close the opend dropdown
    closeDropdown();
  }
});

// Close the openend Dropdowns
function closeDropdown() {
  // remove the open and active class from other opened Dropdown (Closing the opend DropDown)
  document.querySelectorAll('.menu-dropdown-container').forEach(function (container) {
    container.classList.remove('dropdown-open');
  });

  document.querySelectorAll('.menu-dropdown-options').forEach(function (menu) {
    menu.classList.remove('dropdown-active');
  });
}

// close the dropdown on mouse out from the dropdown list
document.querySelectorAll('.menu-dropdown-options').forEach(function (dropDownList) {
  // close the dropdown after user leave the list
  dropDownList.onmouseleave = closeDropdown;
});

// hack to wait until the DOM is really loaded
// Helper function
const domReady = (cb) => {
  document.readyState === 'interactive' || document.readyState === 'complete'
    ? cb()
    : document.addEventListener('DOMContentLoaded', cb);
};

document.addEventListener('DOMContentLoaded', function () {
  domReady(() => {
    // Get all the dropdown from document
    document.querySelectorAll('.menu-dropdown-toggle').forEach(dropDownFunc);
  });
});
