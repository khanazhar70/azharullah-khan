
document.addEventListener("DOMContentLoaded", function () {
  // Store selected variants for each product
  window.selectedVariants = {};

  // Initialize all functionality
  initCustomDropdowns();
  initColorSwatches();
  initAddToCart();
  initCloseButtons();

  function initCloseButtons() {
    document.querySelectorAll(".popup-close").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        closeProductPopup();
      });
    });
  }

  function initCustomDropdowns() {
    document.querySelectorAll(".custom-dropdown").forEach((dropdown) => {
      const selectedOption = dropdown.querySelector(".selected-option");
      const productId = dropdown.dataset.productId;

      selectedOption.addEventListener("click", (e) => {
        e.stopPropagation();
        document
          .querySelectorAll(".custom-dropdown")
          .forEach((d) => d.classList.remove("active"));
        dropdown.classList.toggle("active");
      });

      dropdown.querySelectorAll(".option").forEach((option) => {
        option.addEventListener("click", (e) => {
          e.stopPropagation();
          selectedOption.textContent = option.dataset.value;
          selectedOption.classList.add("selected");
          dropdown.classList.remove("active");

          if (!window.selectedVariants[productId])
            window.selectedVariants[productId] = {};
          window.selectedVariants[productId][option.dataset.option] =
            option.dataset.value;

          clearError(productId);
          updateVariantPrice(productId);
        });
      });
    });

    document.addEventListener("click", () => {
      document
        .querySelectorAll(".custom-dropdown")
        .forEach((d) => d.classList.remove("active"));
    });
  }

  function initColorSwatches() {
    document.querySelectorAll(".color-swatch").forEach((swatch) => {
      swatch.addEventListener("click", (e) => {
        e.stopPropagation();
        const productId = swatch.closest(".color-swatches").dataset.productId;

        swatch.parentElement
          .querySelectorAll(".color-swatch")
          .forEach((s) => s.classList.remove("color-active"));
        swatch.classList.add("color-active");

        if (!window.selectedVariants[productId])
          window.selectedVariants[productId] = {};
        window.selectedVariants[productId][swatch.dataset.option] =
          swatch.dataset.value;

        clearError(productId);
        updateVariantPrice(productId);
      });
    });
  }

  function initAddToCart() {
    document.querySelectorAll(".add-to-cart-btn").forEach((button) => {
      button.addEventListener("click", () =>
        handleAddToCart(button.dataset.productId)
      );
    });
  }

  async function handleAddToCart(productId) {
    const button = document.querySelector(
      `[data-product-id="${productId}"].add-to-cart-btn`
    );
    const selectedOptions = window.selectedVariants[productId] || {};

    // Validate selections
    if (!selectedOptions.Color)
      return showError(productId, "Please select a color");
    if (!selectedOptions.Size)
      return showError(productId, "Please select a size");

    // Find variant
    const productElement = document.querySelector(
      `[product-data-id="${productId}"]`
    );
    const variants = JSON.parse(productElement.dataset.variants);
    let selectedVariant = variants.find(      
      (v) =>
        (v.option1 === selectedOptions.Color &&
          v.option2 === selectedOptions.Size) ||
        (v.option1 === selectedOptions.Size &&
          v.option2 === selectedOptions.Color)
    );

    if (!selectedVariant)
      return showError(productId, "Selected combination not available");
    if (!selectedVariant.available)
      return showError(productId, "Variant out of stock");

    // Prepare items to add - MAIN CHANGE IS HERE
    const itemsToAdd = [{ id: selectedVariant.id, quantity: 1 }];

    // Only add extra product if color is Black and size is M
    const isBlackAndM =
      selectedOptions.Color.toLowerCase() === "black" &&
      selectedOptions.Size.toUpperCase() === "M";

    if (isBlackAndM) {
      itemsToAdd.push({ id: 42121310928980, quantity: 1 }); // Add the extra product
    }

    // Add to cart
    button.disabled = true;
    button.textContent = "Adding...";

    try {
      for (const item of itemsToAdd) {
        const response = await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        const data = await response.json();
        if (data.status === 422) throw new Error(data.description);
      }

      closeProductPopup();
      alert(`Product added to cart${isBlackAndM ? " with bonus item" : ""}!`);
      updateCartCount();
    } catch (error) {
      showError(productId, error.message || "Failed to add to cart");
    } finally {
      button.disabled = false;
      button.textContent = "Add to Cart";
    }
  }

  function showError(productId, message) {
    const errorElement = document.getElementById(`error-${productId}`);
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }

  function clearError(productId) {
    const errorElement = document.getElementById(`error-${productId}`);
    errorElement.style.display = "none";
  }

  function updateVariantPrice(productId) {
    const selectedOptions = window.selectedVariants[productId] || {};
    if (!selectedOptions.Color || !selectedOptions.Size) return;

    const productElement = document.querySelector(
      `[product-data-id="${productId}"]`
    );
    const variants = JSON.parse(productElement.dataset.variants);
    const variant = variants.find(
      (v) =>
        (v.option1 === selectedOptions.Color &&
          v.option2 === selectedOptions.Size) ||
        (v.option1 === selectedOptions.Size &&
          v.option2 === selectedOptions.Color)
    );

    const priceElement = document.getElementById(`variantPrice-${productId}`);
    if (variant && priceElement) {
      priceElement.textContent = `${(variant.price / 100).toFixed(2)}`;
    }
  }

  function updateCartCount() {
    fetch("/cart.js")
      .then((res) => res.json())
      .then((cart) => {
        document
          .querySelectorAll(".cart-count")
          .forEach((el) => (el.textContent = cart.item_count));
      })
      .catch(console.error);
  }

  function resetSelections(productId) {
    delete window.selectedVariants[productId];
    document
      .querySelectorAll(
        `.color-swatches[data-product-id="${productId}"] .color-swatch`
      )
      .forEach((s) => s.classList.remove("color-active"));

    const dropdown = document.querySelector(
      `.custom-dropdown[data-product-id="${productId}"]`
    );
    if (dropdown) {
      const selectedOption = dropdown.querySelector(".selected-option");
      if (selectedOption) {
        selectedOption.textContent = "Select your size";
        selectedOption.classList.remove("selected");
      }
    }

    clearError(productId);
    const priceElement = document.getElementById(`variantPrice-${productId}`);
    if (priceElement) {
      const variants = JSON.parse(
        document.querySelector(`[product-data-id="${productId}"]`).dataset
          .variants
      );
      if (variants[0])
        priceElement.textContent = `$${(variants[0].price / 100).toFixed(2)}`;
    }
  }

  window.resetSelections = resetSelections;
  window.closeProductPopup = () => {
    document.querySelector(".popup-overlay.active")?.classList.remove("active");
    document.body.style.overflow = "";
    document
      .querySelectorAll(".custom-dropdown")
      .forEach((d) => d.classList.remove("active"));
  };

  window.openProductPopup = (productId) => {
    const popup = document.getElementById(`productPopup-${productId}`);
    if (popup) {
      popup.classList.add("active");
      document.body.style.overflow = "hidden";
      resetSelections(productId);
    }
  };
});

// Event listeners for popup closing
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("popup-overlay")) window.closeProductPopup();
});
