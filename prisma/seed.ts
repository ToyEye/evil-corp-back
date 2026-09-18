/**
 * Seed will copy frontend dummy data in a later step.
 * All users: Password123!
 */
async function main() {
  // Intentionally empty until schema + dummy seed are implemented.
}

main()
  .then(() => {
    console.log('Seed stub: nothing to apply yet.');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
