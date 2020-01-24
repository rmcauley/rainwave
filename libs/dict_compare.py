import pprint

pp = pprint.PrettyPrinter(indent=4)

def print_differences(ref_data, compare_data):
	# Short-circuit any funny testing
	if ref_data == compare_data:
		return True

	passed = True

	for key, value in ref_data.items():
		if key not in compare_data:
			print( "[Compare] lacks key: %s" % key)
			passed = False
		elif type(value) == 'dict':
			if not print_differences(value, compare_data[key]):
				print( "\t... in key %s" % key)
				passed = False
		elif value != compare_data[key]:
			print( "Compare differs on key %s" % key)
			print( "\tReference data:")
			pp.pprint(value)
			print( "\tComparison data:")
			pp.pprint(compare_data[key])
			passed = False

	for key, value in compare_data.items():
		if key not in ref_data:
			print( "[Ref    ] lacks key: %s" % key)
			passed = False

	return passed
