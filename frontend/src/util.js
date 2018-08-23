function available_options(initial_options, selected_options) {
    return initial_options
      // remove duplicates
      .filter((i, pos) => initial_options.indexOf(i) === pos )
      .filter(x => !selected_options.includes(x));
}

const isOwnedBy = (i, ownerNames) => {
  let intersection =  i.owners.filter(o => ownerNames.includes(o))
  return intersection.length > 0;
}

export { isOwnedBy, available_options }
