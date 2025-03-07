clear
clear matrix
set more off

// Adapted from https://github.com/akirawisnu
  
capture program drop MerryChristmas
program define MerryChristmas
	local thisyear=yofd(today())
	di "{break}"
	forval i=0(4)12 {
		forval j=1(2)9 {
			local n=`i'+`j'
			local tree=" "
			forval k=1/`n' {
				if `n'==1 {
					local tree="`tree'"+"{res}*"
				}
				else if uniform()>0.8 {
					local tree="`tree'"+"{error}*"
				}
				else {
					local tree="`tree'"+"{text}*"
				}	
			}
			di "{center:`tree'}"
		}
	}
	di "{center:{input}== Merry Christmas `thisyear' ==}"
	di "{hline}"
end

MerryChristmas

exit
