const fs = require('fs');
let code = fs.readFileSync('store/useCartStore.ts', 'utf8');

// Add error handler to first onSnapshot
code = code.replace(
  `}
      });
    } else { return () => {}; }`,
  `}
      }, (error) => {
        console.log('Error listening to specific order:', error);
      });
    } else { return () => {}; }`
);

// Add error handler to second onSnapshot
code = code.replace(
  `        if (matching) {
          set({ activeOrder: matching });
        }
      }
    });
  },`,
  `        if (matching) {
          set({ activeOrder: matching });
        }
      }
    }, (error) => {
      console.log('Error listening to orders:', error);
    });
  },`
);

fs.writeFileSync('store/useCartStore.ts', code);
