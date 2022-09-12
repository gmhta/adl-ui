// Convert snake/camel case to human readable spaced name


export function fieldLabel(name: string): string {
  return (
    name
      // insert a space before all caps
      .replace(/([A-Z])/g, " $1")
      // uppercase the first character
      .replace(/^./, function (str) {
        return str.toUpperCase();
      })
      // replace _ with space
      .replace(/_/g, " ")
  );
}
